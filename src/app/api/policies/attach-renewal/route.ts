import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentAgent } from "@/lib/auth";
import { ownerIdFor, permissionsFor } from "@/lib/team";
import { extractPdfText } from "@/lib/pdf";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * POST /api/policies/attach-renewal
 * 
 * Simple renewal attachment flow:
 * 1. Upload PDF
 * 2. Extract ONLY policy number and previous policy number
 * 3. Find matching policy in database
 * 4. Attach PDF to that policy
 * 5. Done - no review screen needed
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
    
    if (!(file instanceof File) || file.type !== "application/pdf") {
      return NextResponse.json({ error: "Only PDF files are supported" }, { status: 400 });
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const db = createAdminClient();
    const ownerId = ownerIdFor(agent);

    // Upload to storage
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${ownerId}/${Date.now()}-${safeName}`;
    
    const { error: upErr } = await db.storage
      .from("policy-files")
      .upload(path, bytes, { contentType: "application/pdf", upsert: false });

    if (upErr) {
      return NextResponse.json(
        { error: "Upload failed: " + upErr.message },
        { status: 500 }
      );
    }

    // Extract text and find policy numbers
    const text = await extractPdfText(bytes);
    
    // Extract policy numbers using regex patterns
    const policyNumbers: string[] = [];
    
    // Common patterns for policy numbers
    const patterns = [
      /(?:Policy\s*(?:No|Number|#)\s*:?\s*)?([A-Z0-9]{10,})/gi,
      /(?:Previous\s*Policy\s*(?:No|Number)\s*:?\s*)?([A-Z0-9]{10,})/gi,
      /\b([0-9]{15,20})\b/g, // Long numeric policy numbers
      /\b([A-Z]{2,4}[0-9]{8,})\b/g, // Alphanumeric patterns
    ];
    
    for (const pattern of patterns) {
      const matches = text.matchAll(pattern);
      for (const match of matches) {
        const num = match[1]?.trim();
        if (num && num.length >= 10 && !policyNumbers.includes(num)) {
          policyNumbers.push(num);
        }
      }
    }

    console.log(`[attach-renewal] Found potential policy numbers:`, policyNumbers);

    if (policyNumbers.length === 0) {
      return NextResponse.json({
        error: "No policy number found in document. Please upload manually or enter details.",
        filePath: path,
        mode: "manual"
      }, { status: 400 });
    }

    // Try to match with existing policies
    const { data: policies, error: fetchErr } = await db
      .from("policies")
      .select("id, policy_number, client_id, clients!inner(full_name)")
      .eq("agent_id", ownerId)
      .in("policy_number", policyNumbers);

    if (fetchErr) {
      console.error("[attach-renewal] Database error:", fetchErr);
      return NextResponse.json(
        { error: "Failed to search for matching policies" },
        { status: 500 }
      );
    }

    if (!policies || policies.length === 0) {
      return NextResponse.json({
        error: `No matching policy found for numbers: ${policyNumbers.join(", ")}`,
        filePath: path,
        policyNumbers,
        mode: "manual",
        message: "This policy is not in your database. Please upload it as a new policy with full details."
      }, { status: 404 });
    }

    // Match found - attach the document
    const policy = policies[0];
    
    const { error: updateErr } = await db
      .from("policies")
      .update({ source_file_path: path })
      .eq("id", policy.id);

    if (updateErr) {
      console.error("[attach-renewal] Update error:", updateErr);
      // Clean up uploaded file
      await db.storage.from("policy-files").remove([path]);
      return NextResponse.json(
        { error: "Failed to attach document to policy" },
        { status: 500 }
      );
    }

    console.log(`[attach-renewal] ✅ Successfully attached to policy ${policy.policy_number}`);

    return NextResponse.json({
      success: true,
      message: `Renewal document attached successfully`,
      policy: {
        id: policy.id,
        policy_number: policy.policy_number,
        client_name: (policy.clients as any).full_name,
        client_id: policy.client_id,
      },
      filePath: path,
    });

  } catch (error) {
    console.error("[attach-renewal] Unexpected error:", error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : "An unexpected error occurred",
        details: process.env.NODE_ENV === "development" ? String(error) : undefined
      }, 
      { status: 500 }
    );
  }
}
