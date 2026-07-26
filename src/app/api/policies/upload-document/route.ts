import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/policies/upload-document
 * Upload a policy document directly without parsing
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const policyId = formData.get("policyId") as string;
    const clientName = formData.get("clientName") as string;

    if (!file || !policyId || !clientName) {
      return NextResponse.json(
        { error: "Missing required fields: file, policyId, clientName" },
        { status: 400 }
      );
    }

    // Verify the policy belongs to this agent
    const { data: policy, error: policyError } = await supabase
      .from("policies")
      .select("id, policy_number")
      .eq("id", policyId)
      .eq("agent_id", user.id)
      .single();

    if (policyError || !policy) {
      return NextResponse.json(
        { error: "Policy not found or access denied" },
        { status: 404 }
      );
    }

    // Generate file path
    const timestamp = Date.now();
    const sanitizedClientName = clientName.replace(/[^a-zA-Z0-9]/g, "_");
    const policyNum = policy.policy_number?.replace(/[^a-zA-Z0-9]/g, "_") || "no_number";
    const filePath = `${user.id}/${sanitizedClientName}_${policyNum}_${timestamp}.pdf`;

    // Upload to storage
    const fileBuffer = await file.arrayBuffer();
    const { error: uploadError } = await supabase.storage
      .from("policy-files")
      .upload(filePath, fileBuffer, {
        contentType: "application/pdf",
        upsert: false,
      });

    if (uploadError) {
      console.error("Storage upload error:", uploadError);
      throw new Error("Failed to upload file to storage");
    }

    // Update policy with file path
    const { error: updateError } = await supabase
      .from("policies")
      .update({ source_file_path: filePath })
      .eq("id", policyId)
      .eq("agent_id", user.id);

    if (updateError) {
      console.error("Policy update error:", updateError);
      // Try to clean up the uploaded file
      await supabase.storage.from("policy-files").remove([filePath]);
      throw new Error("Failed to attach file to policy");
    }

    return NextResponse.json({
      success: true,
      message: "Document uploaded successfully",
      filePath,
    });
  } catch (error) {
    console.error("Upload document error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed" },
      { status: 500 }
    );
  }
}
