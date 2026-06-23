import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentAgent } from "@/lib/auth";
import { ownerIdFor, isColleague, logActivity } from "@/lib/team";
import type { Policy } from "@/lib/types";

export const runtime = "nodejs";

/** Remove stored PDFs for the given policies (best-effort). */
async function removePolicyFiles(
  db: ReturnType<typeof createAdminClient>,
  policies: Pick<Policy, "source_file_path">[]
) {
  const paths = policies
    .map((p) => p.source_file_path)
    .filter((p): p is string => !!p);
  if (paths.length === 0) return;
  for (let i = 0; i < paths.length; i += 100) {
    await db.storage.from("policy-files").remove(paths.slice(i, i + 100));
  }
}

/**
 * DELETE a client (and cascade their policies) OR all clients for the owner.
 *  - DELETE /api/clients?id=<clientId>   → delete one client
 *  - DELETE /api/clients?all=1           → delete ALL clients
 *
 * Owner-only. Colleagues are blocked entirely (no delete in colleague mode).
 * Policies are removed via the DB cascade; stored PDFs are cleaned up too.
 */
export async function DELETE(request: NextRequest) {
  const agent = await getCurrentAgent();
  if (!agent || agent.status !== "approved") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  // Colleagues cannot delete clients — only the account owner can.
  if (isColleague(agent)) {
    return NextResponse.json(
      { error: "Colleagues are not allowed to delete clients." },
      { status: 403 }
    );
  }

  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  const all = url.searchParams.get("all") === "1";
  const db = createAdminClient();
  const ownerId = ownerIdFor(agent);

  if (all) {
    // Clean up all stored files first, then delete every client (policies
    // cascade via FK on delete).
    const { data: policies } = await db
      .from("policies")
      .select("source_file_path")
      .eq("agent_id", ownerId);
    await removePolicyFiles(db, (policies as Policy[]) || []);

    const { error } = await db.from("clients").delete().eq("agent_id", ownerId);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    await logActivity(agent, "delete_all_clients", "Deleted all clients");
    return NextResponse.json({ ok: true });
  }

  if (!id) {
    return NextResponse.json(
      { error: "Provide a client id or all=1" },
      { status: 400 }
    );
  }

  // Confirm the client belongs to this owner before deleting.
  const { data: client } = await db
    .from("clients")
    .select("id, full_name")
    .eq("id", id)
    .eq("agent_id", ownerId)
    .maybeSingle();
  if (!client) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  const { data: policies } = await db
    .from("policies")
    .select("source_file_path")
    .eq("agent_id", ownerId)
    .eq("client_id", id);
  await removePolicyFiles(db, (policies as Policy[]) || []);

  const { error } = await db
    .from("clients")
    .delete()
    .eq("id", id)
    .eq("agent_id", ownerId);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await logActivity(
    agent,
    "delete_client",
    (client as { full_name: string }).full_name
  );
  return NextResponse.json({ ok: true });
}
