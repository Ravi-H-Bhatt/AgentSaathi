import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentAgent } from "@/lib/auth";
import { ownerIdFor, permissionsFor, logActivity } from "@/lib/team";
import { getWorkspace } from "@/lib/workspace";
import type { Policy } from "@/lib/types";

export const runtime = "nodejs";

/**
 * PATCH a client's editable details (currently the mobile number).
 * Body: { id: string, phone: string | null }
 * Owner + colleagues with the "clients" permission may update; scoped to the
 * active workspace and the caller's owner so no one edits another's data.
 */
export async function PATCH(request: NextRequest) {
  const agent = await getCurrentAgent();
  if (!agent || agent.status !== "approved") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!permissionsFor(agent).clients) {
    return NextResponse.json(
      { error: "You don't have permission to edit clients." },
      { status: 403 }
    );
  }

  const body = (await request.json().catch(() => ({}))) as {
    id?: unknown;
    phone?: unknown;
  };
  const id = typeof body.id === "string" ? body.id : "";
  if (!id) {
    return NextResponse.json({ error: "Missing client id" }, { status: 400 });
  }

  // Validate: Indian mobile number only. Accept a bare 10-digit number, or one
  // prefixed with 91 / +91, and store the canonical 10 digits. Must start 6-9.
  let phone: string | null = null;
  if (typeof body.phone === "string" && body.phone.trim() !== "") {
    let digits = body.phone.replace(/\D/g, "");
    if (digits.length === 12 && digits.startsWith("91")) digits = digits.slice(2);
    if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1);
    if (!/^[6-9]\d{9}$/.test(digits)) {
      return NextResponse.json(
        { error: "Enter a valid 10-digit Indian mobile number." },
        { status: 400 }
      );
    }
    phone = digits;
  }

  const db = createAdminClient();
  const ownerId = ownerIdFor(agent);
  const workspace = await getWorkspace();

  const { data: client } = await db
    .from("clients")
    .select("id, full_name, phone_manual")
    .eq("id", id)
    .eq("agent_id", ownerId)
    .eq("workspace", workspace)
    .maybeSingle();
  if (!client) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  // Only manually-entered numbers may be edited. A number that was EXTRACTED
  // from a policy (phone set, phone_manual = false) stays fixed.
  const c = client as { full_name: string; phone_manual?: boolean };

  let { error } = await db
    .from("clients")
    .update({ phone, phone_manual: true })
    .eq("id", id)
    .eq("agent_id", ownerId)
    .eq("workspace", workspace);
  // Gracefully handle the case where the phone_manual column isn't migrated yet.
  if (error && /phone_manual/i.test(error.message) && /column/i.test(error.message)) {
    ({ error } = await db
      .from("clients")
      .update({ phone })
      .eq("id", id)
      .eq("agent_id", ownerId)
      .eq("workspace", workspace));
  }
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await logActivity(
    agent,
    "update_client_phone",
    `${c.full_name}: ${phone || "cleared"}`,
    workspace
  );

  return NextResponse.json({ ok: true, phone, phone_manual: true });
}

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
  // Deleting requires the "delete" permission (owners always have it;
  // colleagues only when the owner grants it).
  if (!permissionsFor(agent).delete) {
    return NextResponse.json(
      { error: "You don't have permission to delete clients." },
      { status: 403 }
    );
  }

  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  const all = url.searchParams.get("all") === "1";
  const db = createAdminClient();
  const ownerId = ownerIdFor(agent);
  const workspace = await getWorkspace();

  if (all) {
    // Clean up all stored files first (paginate past the 1000-row cap so we
    // fetch EVERY file path, not just the first 1000).
    const allPaths: Pick<Policy, "source_file_path">[] = [];
    {
      let from = 0;
      const pageSize = 1000;
      for (;;) {
        const { data } = await db
          .from("policies")
          .select("source_file_path")
          .eq("agent_id", ownerId)
          .eq("workspace", workspace)
          .range(from, from + pageSize - 1);
        const batch = (data as Policy[]) || [];
        allPaths.push(...batch);
        if (batch.length < pageSize) break;
        from += pageSize;
      }
    }
    await removePolicyFiles(db, allPaths);

    // Explicitly delete policies FIRST (belt-and-suspenders — don't rely only
    // on the FK cascade), then delete clients. This guarantees a truly clean
    // slate so a re-upload imports everything fresh.
    const { error: polErr } = await db
      .from("policies")
      .delete()
      .eq("agent_id", ownerId)
      .eq("workspace", workspace);
    if (polErr) {
      return NextResponse.json({ error: polErr.message }, { status: 500 });
    }

    const { error } = await db
      .from("clients")
      .delete()
      .eq("agent_id", ownerId)
      .eq("workspace", workspace);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    await logActivity(agent, "delete_all_clients", "Deleted all clients", workspace);
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
    .eq("workspace", workspace)
    .maybeSingle();
  if (!client) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  const { data: policies } = await db
    .from("policies")
    .select("source_file_path")
    .eq("agent_id", ownerId)
    .eq("workspace", workspace)
    .eq("client_id", id);
  await removePolicyFiles(db, (policies as Policy[]) || []);

  const { error } = await db
    .from("clients")
    .delete()
    .eq("id", id)
    .eq("agent_id", ownerId)
    .eq("workspace", workspace);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await logActivity(
    agent,
    "delete_client",
    (client as { full_name: string }).full_name,
    workspace
  );
  return NextResponse.json({ ok: true });
}
