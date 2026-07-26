import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentAgent } from "@/lib/auth";
import { ownerIdFor, permissionsFor, logActivity } from "@/lib/team";
import { getWorkspace } from "@/lib/workspace";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * POST /api/policies/upload-document
 * 
 * Upload a document directly to a specific policy (no parsing, direct attachment).
 * Body: FormData with:
 *  - file: PDF file
 *  - policyId: ID of the policy to attach to
 */
export async function POST(request: NextRequest) {
  try {
    const agent = await getCurrentAgent();
    if (!agent || agent.status !== "approved") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    if (!permissionsFor(agent).upload) {
      return NextResponse.json(
        { error: "You don't have permission to upload documents." },
        { status: 403 }
      );
    }

    const form = await request.formData();
    const file = form.get("file");
    const policyId = form.get("policyId");
    
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "File is required" }, { status: 400 });
    }

    if (file.type !== "application/pdf") {
      return NextResponse.json({ error: "Only PDF files are supported" }, { status: 400 });
    }

    if (!policyId || typeof policyId !== "string") {
      return NextResponse.json({ error: "Policy ID is required" }, { status: 400 });
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const db = createAdminClient();
    const ownerId = ownerIdFor(agent);
    const workspace = await getWorkspace();

    // Verify policy belongs to this agent
    const { data: policy } = await db
      .from("policies")
      .select("id, policy_number, client_id, clients!inner(full_name)")
      .eq("id", policyId)
      .eq("agent_id", ownerId)
      .eq("workspace", workspace)
      .maybeSingle();

    if (!policy) {
      return NextResponse.json(
        { error: "Policy not found or access denied" },
        { status: 404 }
      );
    }

    // Upload to storage
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${ownerId}/${Date.now()}-${safeName}`;
    
    const { error: upErr } = await db.storage
      .from("policy-files")
      .upload(path, bytes, { contentType: "application/pdf", upsert: false });

    if (upErr) {
      console.error("[upload-document] Storage upload error:", upErr);
      return NextResponse.json(
        { error: "Upload failed: " + upErr.message },
        { status: 500 }
      );
    }

    // If policy already has a file, optionally remove the old one
    // (commented out to keep file history - you can enable if needed)
    // if (policy.source_file_path) {
    //   await db.storage.from("policy-files").remove([policy.source_file_path]);
    // }

    // Attach document to policy
    const { error: updateErr } = await db
      .from("policies")
      .update({ source_file_path: path })
      .eq("id", policyId)
      .eq("agent_id", ownerId)
      .eq("workspace", workspace);

    if (updateErr) {
      console.error("[upload-document] Update error:", updateErr);
      // Clean up uploaded file
      await db.storage.from("policy-files").remove([path]);
      return NextResponse.json(
        { error: "Failed to attach document to policy" },
        { status: 500 }
      );
    }

    await logActivity(
      agent,
      "upload_policy_document",
      `${(policy.clients as any).full_name} - ${policy.policy_number}`,
      workspace
    );

    console.log(`[upload-document] ✅ Document attached to policy ${policy.policy_number}`);

    return NextResponse.json({
      success: true,
      message: "Document uploaded successfully",
      policy: {
        id: policy.id,
        policy_number: policy.policy_number,
        client_name: (policy.clients as any).full_name,
      },
      filePath: path,
    });

  } catch (error) {
    console.error("[upload-document] Unexpected error:", error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : "An unexpected error occurred",
        details: process.env.NODE_ENV === "development" ? String(error) : undefined
      }, 
      { status: 500 }
    );
  }
}
