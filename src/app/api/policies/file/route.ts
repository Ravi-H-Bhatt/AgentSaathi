import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentAgent } from "@/lib/auth";
import { ownerIdFor, logActivity } from "@/lib/team";
import { getWorkspace } from "@/lib/workspace";
import type { Policy } from "@/lib/types";

export const runtime = "nodejs";

/**
 * Return a short-lived signed URL for a policy's stored PDF.
 * Ownership is enforced: the policy must belong to the caller's owner.
 * GET /api/policies/file?policyId=...&download=1
 */
export async function GET(request: NextRequest) {
  const agent = await getCurrentAgent();
  if (!agent || agent.status !== "approved") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const policyId = url.searchParams.get("policyId");
  const download = url.searchParams.get("download") === "1";
  if (!policyId) {
    return NextResponse.json({ error: "Missing policyId" }, { status: 400 });
  }

  const db = createAdminClient();
  const ownerId = ownerIdFor(agent);
  const workspace = await getWorkspace();
  const { data: policy } = await db
    .from("policies")
    .select("id, source_file_path, policy_number")
    .eq("id", policyId)
    .eq("agent_id", ownerId)
    .eq("workspace", workspace)
    .maybeSingle();

  const p = policy as Pick<Policy, "id" | "source_file_path" | "policy_number"> | null;
  if (!p) {
    return NextResponse.json({ error: "Policy not found" }, { status: 404 });
  }
  if (!p.source_file_path) {
    return NextResponse.json(
      { error: "No document is stored for this policy." },
      { status: 404 }
    );
  }

  const downloadName = `${p.policy_number || "policy"}.pdf`;
  const { data, error } = await db.storage
    .from("policy-files")
    .createSignedUrl(p.source_file_path, 120, {
      download: download ? downloadName : false,
    });

  if (error || !data) {
    return NextResponse.json(
      { error: "Could not generate file link: " + (error?.message || "") },
      { status: 500 }
    );
  }

  // Record who viewed/downloaded which document (for the activity feed).
  await logActivity(
    agent,
    download ? "download_document" : "view_document",
    `Policy #${p.policy_number || "—"}`,
    workspace
  );

  return NextResponse.json({ url: data.signedUrl });
}
