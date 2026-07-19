import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentAgent } from "@/lib/auth";
import { ownerIdFor, permissionsFor, logActivity } from "@/lib/team";
import { extractPdfText } from "@/lib/pdf";
import { extractPolicyFromText, extractBulkPoliciesFromText } from "@/lib/groq";
import { parseRegisterAuto } from "@/lib/register";

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
        const { parseUnitedIndiaExcel } = await import('@/lib/united-india-excel');
        const rows = parseUnitedIndiaExcel(bytes);
        
        if (rows.length > 0) {
          return NextResponse.json({
            filePath: path,
            fileName: file.name,
            scanned: false,
            mode: "bulk",
            rowCount: rows.length,
            rows,
            registerType: 'united-india-excel',
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

  // LIC "Premium Due List" — deterministic, highest priority (its own format
  // and dedup/renewal rules). Detect before the generic register parsers.
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
