import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentAgent } from "@/lib/auth";
import { ownerIdFor, permissionsFor, logActivity } from "@/lib/team";
import { getWorkspace } from "@/lib/workspace";
import { savePolicyForOwner, type SavePolicyInput } from "@/lib/policies";
import type { Policy } from "@/lib/types";

export const runtime = "nodejs";

/** Create (or reuse) a client and attach a policy. */
export async function POST(request: NextRequest) {
  const agent = await getCurrentAgent();
  if (!agent || agent.status !== "approved") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!permissionsFor(agent).upload) {
    return NextResponse.json(
      { error: "You don't have permission to add policies." },
      { status: 403 }
    );
  }

  const body = (await request.json()) as SavePolicyInput;
  if (!body.client_name || !body.client_name.trim()) {
    return NextResponse.json({ error: "Client name is required" }, { status: 400 });
  }

  try {
    const workspace = await getWorkspace();
    const result = await savePolicyForOwner(ownerIdFor(agent), body, workspace);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Save failed" },
      { status: 500 }
    );
  }
}

/**
 * Delete a single policy: DELETE /api/policies?id=<policyId>
 * Requires the "delete" permission. Ownership + workspace are enforced.
 * If it was the client's last policy in this workspace, the now-empty client
 * is removed too (the response flags this so the UI can redirect).
 */
export async function DELETE(request: NextRequest) {
  const agent = await getCurrentAgent();
  if (!agent || agent.status !== "approved") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!permissionsFor(agent).delete) {
    return NextResponse.json(
      { error: "You don't have permission to delete policies." },
      { status: 403 }
    );
  }

  const id = new URL(request.url).searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing policy id" }, { status: 400 });
  }

  const db = createAdminClient();
  const ownerId = ownerIdFor(agent);
  const workspace = await getWorkspace();

  // Confirm the policy belongs to this owner + workspace before touching it.
  const { data: policy } = await db
    .from("policies")
    .select("id, client_id, source_file_path, policy_number")
    .eq("id", id)
    .eq("agent_id", ownerId)
    .eq("workspace", workspace)
    .maybeSingle();
  const p = policy as Pick<
    Policy,
    "id" | "client_id" | "source_file_path" | "policy_number"
  > | null;
  if (!p) {
    return NextResponse.json({ error: "Policy not found" }, { status: 404 });
  }

  // Remove the stored PDF (best-effort — never block the delete).
  if (p.source_file_path) {
    try {
      await db.storage.from("policy-files").remove([p.source_file_path]);
    } catch {
      /* ignore storage errors */
    }
  }

  const { error } = await db
    .from("policies")
    .delete()
    .eq("id", id)
    .eq("agent_id", ownerId)
    .eq("workspace", workspace);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // If the client now has no policies left in this workspace, delete it too.
  let clientDeleted = false;
  const { count } = await db
    .from("policies")
    .select("id", { count: "exact", head: true })
    .eq("agent_id", ownerId)
    .eq("workspace", workspace)
    .eq("client_id", p.client_id);
  if ((count ?? 0) === 0) {
    await db
      .from("clients")
      .delete()
      .eq("id", p.client_id)
      .eq("agent_id", ownerId)
      .eq("workspace", workspace);
    clientDeleted = true;
  }

  await logActivity(
    agent,
    "delete_policy",
    `Policy #${p.policy_number || "—"}`,
    workspace
  );
  return NextResponse.json({ ok: true, clientDeleted });
}
