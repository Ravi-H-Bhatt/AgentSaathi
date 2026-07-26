import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentAgent } from "@/lib/auth";
import { ownerIdFor, permissionsFor, logActivity } from "@/lib/team";
import { extractPdfText } from "@/lib/pdf";
import { extractPolicyFromText, extractBulkPoliciesFromText } from "@/lib/groq";
import { parseRegisterAuto } from "@/lib/register";
import { detectUnitedIndiaDocumentType } from "@/lib/unitedindia-detector";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Accepts a single PDF file (multipart/form-data, field "file").
 * Stores it in the agent's storage folder, extracts text, and returns
 * structured (editable) fields plus the storage path.
 */
export async function POST(request: NextRequest) {
  try {
    const agent = await getCurrentAgent();
    if (!agent || agent.status !== "approved") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!permissionsFor(agent).upload) {
      return NextResponse.json(
        { error: "You don't have permission to upload policies." },
        { status: 403 }
      );
    }

    const form = await request.formData();
    const file = form.get("file");
    const category = (() => {
      const c = String(form.get("category") || "").toUpperCase();
      return c === "LIFE" || c === "GENERAL" ? (c as "LIFE" | "GENERAL") : null;
    })();
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }
    
    const isExcel = file.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" || 
                    file.type === "application/vnd.ms-excel" ||
                    file.name.endsWith('.xlsx') || file.name.endsWith('.xls');
    const isPdf = file.type === "application/pdf";
    
    if (!isPdf && !isExcel) {
      return NextResponse.json({ error: "Only PDF and Excel files are supported" }, { status: 400 });
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const db = createAdminClient();
    const ownerId = ownerIdFor(agent);

    // Store original under {ownerId}/{timestamp}-{filename}
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${ownerId}/${Date.now()}-${safeName}`;
    const contentType = isExcel ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" : "application/pdf";
    const { error: upErr } = await db.storage
      .from("policy-files")
      .upload(path, bytes, { contentType, upsert: false });

    if (upErr) {
      return NextResponse.json(
        { error: "Upload failed: " + upErr.message },
        { status: 500 }
      );
    }

    await logActivity(agent, "upload_policy", file.name);

    // Handle Excel files
    if (isExcel) {
      try {
        // "Transaction Report" style sheets (e.g. M080) map columns by HEADER
        // name (Ins.Co, Type Of Policy, Name of Client, Total, PolicyNo,
        // From/To Date). Try this first; fall back to the fixed-column
        // United India layout.
        const { parseTransactionReportExcel } = await import(
          "@/lib/transaction-report-excel"
        );
        let rows = parseTransactionReportExcel(bytes);
        let registerType = "transaction-report-excel";

        if (rows.length === 0) {
          const { parseUnitedIndiaExcel } = await import("@/lib/united-india-excel");
          rows = parseUnitedIndiaExcel(bytes);
          registerType = "united-india-excel";
        }

        if (rows.length > 0) {
          return NextResponse.json({
            filePath: path,
            fileName: file.name,
            scanned: false,
            mode: "bulk",
            rowCount: rows.length,
            rows,
            registerType,
            confidence: 1.0,
          });
        } else {
          return NextResponse.json({
            error: "No valid policy data found in Excel file",
          }, { status: 400 });
        }
      } catch (err: any) {
        console.error('[extract] Excel parsing error:', err);
        return NextResponse.json({
          error: `Failed to parse Excel: ${err.message}`,
        }, { status: 500 });
      }
    }

    // Extract text layer from PDF
    const text = await extractPdfText(bytes);

    if (!text || text.length < 20) {
      return NextResponse.json({
        filePath: path,
        fileName: file.name,
        scanned: true,
        message:
        "This PDF has no readable text layer (it may be a scan/image). Please enter the details manually.",
      extracted: emptyExtract(),
    });
  }

  // LIC "Date Wise Premium Due" — newest format with F.U.P as actual renewal date
  {
    const { looksLikeLicDateWise, parseLicDateWise } = await import(
      "@/lib/lic-date-wise"
    );
    if (looksLikeLicDateWise(text)) {
      const licRows = parseLicDateWise(text);
      if (licRows.length > 0) {
        console.log(`[extract] Detected LIC Date Wise Premium Due: ${licRows.length} rows`);
        return NextResponse.json({
          filePath: path,
          fileName: file.name,
          scanned: false,
          mode: "bulk",
          rowCount: licRows.length,
          rows: licRows,
          registerType: "lic-date-wise",
          confidence: 1.0,
        });
      }
    }
  }

  // LIC "Premium Due List" — older format, check after Date Wise format
  {
    const { looksLikeLicPremiumDueList, parseLicPremiumDueList } = await import(
      "@/lib/lic-premium-due"
    );
    if (looksLikeLicPremiumDueList(text)) {
      const licRows = parseLicPremiumDueList(text);
      if (licRows.length > 0) {
        console.log(`[extract] Detected LIC Premium Due List: ${licRows.length} rows`);
        return NextResponse.json({
          filePath: path,
          fileName: file.name,
          scanned: false,
          mode: "bulk",
          rowCount: licRows.length,
          rows: licRows,
          registerType: "lic-premium-due",
          confidence: 1.0,
        });
      }
    }
  }

  // Use auto-detection to parse any supported register type
  const { rows, type, confidence } = await parseRegisterAuto(text, bytes);
  if (rows.length > 0 && confidence >= 0.5) {
    // New India single "Policy Schedule" — one policy carrying current +
    // previous policy numbers. Handle it as its own mode so the UI skips the
    // bulk table and just matches/attaches (or saves) directly.
    if (type === 'newindia-schedule') {
      return NextResponse.json({
        filePath: path,
        fileName: file.name,
        scanned: false,
        mode: "schedule",
        rows,
        registerType: type,
        confidence: 1.0,
      });
    }

    // For New India registers, use fast coordinate-based extraction
    if (type === 'newindia') {
      console.log('[extract] Using fast coordinate extraction for New India');
      const { parseNewIndiaRegisterFast } = await import('@/lib/newindia-fast');
      const fastRows = await parseNewIndiaRegisterFast(bytes);
      
      return NextResponse.json({
        filePath: path,
        fileName: file.name,
        scanned: false,
        mode: "bulk",
        rowCount: fastRows.length,
        rows: fastRows,
        registerType: type,
        confidence: 1.0, // Coordinate-based is 100% reliable
      });
    }
    
    // For E-Register, use coordinate-based extraction directly from buffer
    if (type === 'eregister') {
      console.log('[extract] Using coordinate extraction for E-Register');
      const { parseERegister } = await import('@/lib/eregister-parser');
      const eRegisterRows = await parseERegister(bytes);
      
      return NextResponse.json({
        filePath: path,
        fileName: file.name,
        scanned: false,
        mode: "bulk",
        rowCount: eRegisterRows.length,
        rows: eRegisterRows,
        registerType: type,
        confidence: 1.0, // Coordinate-based is 100% reliable
      });
    }
    
    return NextResponse.json({
      filePath: path,
      fileName: file.name,
      scanned: false,
      mode: "bulk",
      rowCount: rows.length,
      rows,
      registerType: type,
      confidence,
    });
  }

  // Check if this looks like a multi-policy document (e.g., insurance company reports)
  const policyCount = (text.match(/\b\d{9,}\b/g) || []).length;
  if (policyCount >= 10) {
    // Many policies detected — use LLM to extract in bulk
    try {
      const bulkExtracted = await extractBulkPoliciesFromText(text, category);
      if (bulkExtracted && bulkExtracted.length > 0) {
        return NextResponse.json({
          filePath: path,
          fileName: file.name,
          scanned: false,
          mode: "bulk",
          rowCount: bulkExtracted.length,
          rows: bulkExtracted,
        });
      }
    } catch (err) {
      console.error("[extract] Bulk LLM extraction failed:", err);
      // Fall through to single-policy extraction
    }
  }

  // Check if this is a United India Insurance document
  const lowerText = text.toLowerCase();
  const isUnitedIndia = lowerText.includes("united india insurance") ||
                         lowerText.includes("uiic.co.in") ||
                         (lowerText.includes("irdai reg") && lowerText.includes("545"));
  
  if (isUnitedIndia) {
    try {
      // Detect document type (single policy, register, etc.)
      const detection = detectUnitedIndiaDocumentType(text);
      console.log(`[extract] Detected United India document: ${detection.type} (${(detection.confidence * 100).toFixed(0)}% confidence)`);
      
      // Handle single policy documents (Family Floater, Individual, etc.)
      if (!detection.isRegister && detection.policyCount === 1) {
        try {
          const { isUnitedIndiaFloaterPolicy, parseUnitedIndiaFloaterPolicy } = await import('@/lib/unitedindia-floater');
          
          if (isUnitedIndiaFloaterPolicy(text)) {
            try {
              const extracted = parseUnitedIndiaFloaterPolicy(text);
              
              const policyRow = {
                client_name: extracted.client_name,
                policy_number: extracted.policy_number,
                previous_policy_number: extracted.previous_policy_number || null,
                company: extracted.company,
                policy_type: extracted.policy_type,
                product_name: extracted.product_name,
                sum_insured: extracted.sum_insured,
                premium: extracted.premium,
                start_date: extracted.start_date,
                renewal_date: extracted.renewal_date,
                client_address: extracted.client_address,
                policy_holder_type: extracted.policy_holder_type,
              };
              
              console.log(`[extract] ✅ Floater policy detected: ${extracted.policy_number}`);
              
              return NextResponse.json({
                filePath: path,
                fileName: file.name,
                scanned: false,
                mode: "schedule",
                rows: [policyRow],
                registerType: 'unitedindia-floater-schedule',
                confidence: extracted.confidence_score / 100,
                metadata: {
                  detected_on_page: extracted.detected_on_page,
                  family_members_count: extracted.total_family_members || 0,
                  policy_type_detected: extracted.policy_holder_type,
                  detection_type: detection.type,
                },
              });
            } catch (floaterErr) {
              console.log('[extract] Floater parser failed, trying standard parser:', floaterErr);
            }
          }
        } catch (importErr) {
          console.log('[extract] Floater import error:', importErr);
        }
        
        // Fallback to standard United India parser
        try {
          const { parseUnitedIndiaText } = await import('@/lib/unitedindia');
          const extracted = parseUnitedIndiaText(text);
          
          const policyRow = {
            client_name: extracted.client_name,
            policy_number: extracted.policy_number,
            previous_policy_number: extracted.previous_policy_number || null,
            company: extracted.company,
            policy_type: extracted.policy_type,
            product_name: extracted.product_name,
            sum_insured: extracted.sum_insured,
            premium: extracted.premium,
            start_date: extracted.start_date,
            renewal_date: extracted.renewal_date,
            client_address: extracted.client_address,
            policy_holder_type: extracted.policy_holder_type,
          };
          
          console.log(`[extract] ✅ Standard policy detected: ${extracted.policy_number}`);
          
          return NextResponse.json({
            filePath: path,
            fileName: file.name,
            scanned: false,
            mode: "schedule",
            rows: [policyRow],
            registerType: 'unitedindia-schedule',
            confidence: 1.0,
            metadata: { detection_type: detection.type },
          });
        } catch (stdErr) {
          console.error('[extract] Standard United India extraction failed:', stdErr);
        }
      }
      
      // Handle Premium Register (bulk)
      if (detection.type === 'premium-register') {
        try {
          const { parseUnitedIndiaRegister } = await import('@/lib/unitedindia-register');
          const rows = parseUnitedIndiaRegister(text);
          
          if (rows.length > 0) {
            console.log(`[extract] ✅ Premium register detected: ${rows.length} policies`);
            return NextResponse.json({
              filePath: path,
              fileName: file.name,
              scanned: false,
              mode: "bulk",
              rowCount: rows.length,
              rows,
              registerType: 'unitedindia-register',
              confidence: detection.confidence,
              metadata: { detection_type: detection.type },
            });
          }
        } catch (regErr) {
          console.log('[extract] Register parsing error:', regErr);
        }
      }
    } catch (err) {
      console.error('[extract] United India detection error:', err);
    }
  }

  try {
    const extracted = await extractPolicyFromText(text, category);
    return NextResponse.json({
      filePath: path,
      fileName: file.name,
      scanned: false,
      mode: "single",
      category,
      extracted,
    });
  } catch {
    return NextResponse.json({
      filePath: path,
      fileName: file.name,
      scanned: false,
      mode: "single",
      message: "Could not auto-parse the document. Please review/enter fields manually.",
      extracted: emptyExtract(),
    });
  }
  } catch (error) {
    // Catch any unexpected errors and return JSON
    console.error("[extract] Unexpected error:", error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : "An unexpected error occurred during extraction",
        details: process.env.NODE_ENV === "development" ? String(error) : undefined
      }, 
      { status: 500 }
    );
  }
}

function emptyExtract() {
  return {
    client_name: null,
    client_email: null,
    client_phone: null,
    date_of_birth: null,
    age: null,
    company: null,
    policy_type: null,
    policy_number: null,
    sum_insured: null,
    premium: null,
    start_date: null,
    renewal_date: null,
    low_confidence_fields: [],
  };
}
