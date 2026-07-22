import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentAgent } from "@/lib/auth";
import { ownerIdFor, permissionsFor, logActivity } from "@/lib/team";
import { getWorkspace } from "@/lib/workspace";
import type { RegisterRow } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

interface BulkBody {
  rows: RegisterRow[];
  source_file_path?: string | null;
}

/** Normalize a name for grouping/dedup (case + whitespace insensitive). */
function nameKey(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

function cleanName(name: string | null): string | null {
  if (!name) return null;
  const t = name.replace(/\s+/g, " ").trim();
  return t.length ? t : null;
}

/**
 * Bulk import policies from a parsed "Policy Register".
 *
 * - Groups rows by client name so one person with many policies becomes ONE
 *   client with many policies (this is what makes name-search show them all).
 * - Reuses existing clients (same owner + name) instead of duplicating people.
 * - Dedupes policies by policy_number within the owner, so re-uploading the
 *   same register is a no-op.
 */
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

  const body = (await request.json()) as BulkBody;
  const rows = Array.isArray(body.rows) ? body.rows : [];
  if (rows.length === 0) {
    return NextResponse.json({ error: "No rows to import" }, { status: 400 });
  }

  const db = createAdminClient();
  const ownerId = ownerIdFor(agent);
  const workspace = await getWorkspace();

  // Keep only rows that have a client name (policy number is optional in E-Register format).
  const valid = rows.filter((r) => cleanName(r.client_name));
  const skippedNoName = rows.length - valid.length;

  // Load existing clients up front so we can resolve client_id → name.
  const clientIdByKey = new Map<string, string>();
  const clientNameById = new Map<string, string>();
  {
    const { data: existingClients } = await db
      .from("clients")
      .select("id, full_name")
      .eq("agent_id", ownerId)
      .eq("workspace", workspace);
    for (const c of (existingClients as { id: string; full_name: string }[]) || []) {
      const key = nameKey(c.full_name);
      if (!clientIdByKey.has(key)) clientIdByKey.set(key, c.id);
      clientNameById.set(c.id, c.full_name);
    }
  }

  // Build a COMPOSITE dedup key from ALL identifying fields (including client name).
  // A row is a duplicate ONLY if EVERY field matches exactly. This means:
  //   - Same policy# but different premium/date/product => DIFFERENT policy (kept)
  //   - Truly identical rows => skipped
  // Re-uploading the same PDF adds anything not already stored exactly.
  // Normalize a numeric value to a canonical string so 5170, 5170.0 and "5170.00"
  // all compare equal (prevents the same policy being treated as new → doubling).
  const numKey = (n: number | string | null | undefined): string => {
    if (n == null || n === "") return "";
    const v = Number(n);
    return isNaN(v) ? "" : String(v);
  };
  // Normalize a date to YYYY-MM-DD (DB may return with a time component).
  const dateKey = (d: string | null | undefined): string =>
    d ? String(d).slice(0, 10) : "";

  const rowKey = (
    clientName: string,
    policyNumber: string | null,
    productName: string | null,
    policyType: string | null,
    premium: number | string | null,
    sumInsured: number | string | null,
    startDate: string | null,
    renewalDate: string | null
  ): string =>
    [
      (policyNumber || "").trim().toLowerCase(),
      nameKey(clientName),
      (productName || "").trim().toLowerCase(),
      (policyType || "").trim().toLowerCase(),
      numKey(premium),
      numKey(sumInsured),
      dateKey(startDate),
      dateKey(renewalDate),
    ].join("|");

  // ---- 1. Build set of existing policy keys (paginated over ALL policies). ----
  // Also map every stored policy_number → its client_id, so an uploaded renewal
  // can be attached to the client who already holds the current OR previous
  // policy number (renewal mapping).
  const existingKeys = new Set<string>();
  const clientIdByPolicyNumber = new Map<string, string>();
  // policy_number → the stored policy row (id + current file + owning client),
  // so an uploaded document can be attached to the exact matching policy.
  const policyByNumber = new Map<
    string,
    { id: string; source_file_path: string | null; client_id: string }
  >();
  {
    let from = 0;
    const pageSize = 1000;
    for (;;) {
      const { data } = await db
        .from("policies")
        .select(
          "id, policy_number, product_name, policy_type, premium, sum_insured, start_date, renewal_date, client_id, source_file_path"
        )
        .eq("agent_id", ownerId)
        .eq("workspace", workspace)
        .range(from, from + pageSize - 1);
      const batch = (data as any[]) || [];
      if (batch.length === 0) break;
      for (const p of batch) {
        const cname = clientNameById.get(p.client_id) || "";
        if (p.policy_number && p.client_id) {
          clientIdByPolicyNumber.set(String(p.policy_number).trim(), p.client_id);
        }
        if (p.policy_number) {
          policyByNumber.set(String(p.policy_number).trim(), {
            id: p.id,
            source_file_path: p.source_file_path ?? null,
            client_id: p.client_id,
          });
        }
        existingKeys.add(
          rowKey(
            cname,
            p.policy_number,
            p.product_name,
            p.policy_type,
            p.premium,
            p.sum_insured,
            p.start_date,
            p.renewal_date
          )
        );
      }
      if (batch.length < pageSize) break;
      from += pageSize;
    }
  }

  // Renewal mapping: for each row, if its previous OR current policy number is
  // already stored, remember which existing client it belongs to. That client
  // wins over name-based grouping so the renewed policy shows under the right
  // person even when the name is written differently.
  const forcedClientForRow = new Map<RegisterRow, string>();
  for (const r of valid) {
    const prev = r.previous_policy_number?.toString().trim();
    const cur = r.policy_number?.toString().trim();
    const cid =
      (prev && clientIdByPolicyNumber.get(prev)) ||
      (cur && clientIdByPolicyNumber.get(cur)) ||
      null;
    if (cid) forcedClientForRow.set(r, cid);
  }

  // ---- 2. Filter incoming rows: keep every row that is NOT already in the DB.
  //         We deliberately DO NOT dedup within the file — the register can
  //         legitimately list the same client/product/premium twice as two
  //         separate transactions (different Tra IDs), so all such rows are
  //         imported. Re-uploading still won't double, because any row whose
  //         composite key already exists in the DB is skipped. ----
  const toImport = valid.filter((r) => {
    // A renewal/schedule row (has a previous policy number) whose current policy
    // number is already stored → skip, so re-uploading the same policy schedule
    // never doubles it (its name may differ from the mapped client's name).
    if (
      r.previous_policy_number &&
      r.policy_number &&
      clientIdByPolicyNumber.has(String(r.policy_number).trim())
    ) {
      console.log('[bulk] Skipping renewal with existing current policy:', r.policy_number);
      return false;
    }
    const key = rowKey(
      r.client_name!,
      r.policy_number,
      r.product_name,
      r.policy_type,
      r.premium,
      r.sum_insured,
      r.start_date,
      r.renewal_date
    );
    const isDuplicate = existingKeys.has(key);
    if (isDuplicate) {
      console.log('[bulk] Skipping duplicate:', {
        name: r.client_name,
        policy: r.policy_number,
        premium: r.premium,
        key: key.substring(0, 100)
      });
    }
    return !isDuplicate;
  });
  const duplicates = valid.length - toImport.length;
  
  console.log(`[bulk] Filtered: ${toImport.length} to import, ${duplicates} duplicates out of ${valid.length} valid`);

  // ---- Match & document attach (individual policy schedules) ----
  // For a schedule/renewal document (a row carrying a previous policy number):
  //   • "match found" if its CURRENT or PREVIOUS number already exists in the DB.
  //   • If the CURRENT policy is already stored, attach THIS uploaded PDF to that
  //     existing policy so clicking "View" on its card opens this document
  //     (instead of showing nothing / the register it came from).
  // Registers never set previous_policy_number, so this can't affect them.
  let attached = 0;
  let matched = false;
  let matchedClientName: string | null = null;
  let matchedPolicyNumber: string | null = null;
  for (const r of valid) {
    if (!r.previous_policy_number) continue;
    const cur = r.policy_number?.toString().trim() || "";
    const prev = r.previous_policy_number?.toString().trim() || "";
    const curMatch = cur ? policyByNumber.get(cur) : undefined;
    const prevMatch = prev ? policyByNumber.get(prev) : undefined;
    if (curMatch || prevMatch) {
      matched = true;
      const who = (curMatch || prevMatch)!;
      matchedClientName = clientNameById.get(who.client_id) || matchedClientName;
      matchedPolicyNumber = matchedPolicyNumber || cur || prev || null;
    }
    // Backfill the document onto the already-stored current policy.
    if (body.source_file_path && curMatch) {
      const { error: attachErr } = await db
        .from("policies")
        .update({ source_file_path: body.source_file_path })
        .eq("id", curMatch.id)
        .eq("agent_id", ownerId)
        .eq("workspace", workspace);
      if (!attachErr) attached++;
    }
  }

  if (toImport.length === 0) {
    return NextResponse.json({
      ok: true,
      created: 0,
      duplicates,
      skippedNoName,
      skippedConflict: 0,
      clientsCreated: 0,
      matched,
      attached,
      matchedClientName,
      matchedPolicyNumber,
      message: matched
        ? attached > 0
          ? "Match found — document attached to the existing policy."
          : "Match found — this policy already exists."
        : "Nothing new to import — all policies already exist.",
    });
  }

  // ---- 2. Resolve clients: reuse existing, create the rest (one per name). ----
  // (clientIdByKey already loaded above during dedup key building.)
  // Only rows that are NOT force-mapped to an existing client need name-based
  // client grouping/creation. Force-mapped rows attach to their existing client.
  const groupKeys = [
    ...new Set(
      toImport
        .filter((r) => !forcedClientForRow.has(r))
        .map((r) => nameKey(r.client_name!))
    ),
  ];

  // Build inserts for clients that don't exist yet. Carry a phone if present.
  const phoneByKey = new Map<string, string>();
  const displayNameByKey = new Map<string, string>();
  for (const r of toImport) {
    const key = nameKey(r.client_name!);
    if (!displayNameByKey.has(key)) displayNameByKey.set(key, cleanName(r.client_name)!);
    if (r.client_phone && !phoneByKey.has(key)) phoneByKey.set(key, r.client_phone);
  }

  const newClientRows = groupKeys
    .filter((k) => !clientIdByKey.has(k))
    .map((k) => ({
      agent_id: ownerId,
      full_name: displayNameByKey.get(k)!,
      phone: phoneByKey.get(k) || null,
      workspace,
    }));

  let clientsCreated = 0;
  for (let i = 0; i < newClientRows.length; i += 500) {
    const chunk = newClientRows.slice(i, i + 500);
    const { data, error } = await db
      .from("clients")
      .insert(chunk)
      .select("id, full_name");
    if (error) {
      return NextResponse.json(
        { error: "Failed to create clients: " + error.message },
        { status: 500 }
      );
    }
    for (const c of (data as { id: string; full_name: string }[]) || []) {
      clientIdByKey.set(nameKey(c.full_name), c.id);
      clientsCreated++;
    }
  }

  // ---- 3. Build policy rows, linked to their client. ----
  const policyRows = toImport
    .map((r) => {
      // Renewal mapping wins: attach to the existing client that holds the
      // current/previous policy number. Otherwise use the name-grouped client.
      const clientId =
        forcedClientForRow.get(r) || clientIdByKey.get(nameKey(r.client_name!));
      if (!clientId) return null;
      return {
        agent_id: ownerId,
        client_id: clientId,
        workspace,
        company: r.company ?? null,
        policy_type: r.policy_type,
        product_name: r.product_name || null,
        policy_holder_type: r.policy_holder_type || null,
        client_address: r.client_address || null,
        policy_number: r.policy_number,
        sum_insured: r.sum_insured,
        premium: r.premium,
        mode: r.mode,
        start_date: r.start_date,
        renewal_date: r.renewal_date,
        source_file_path: body.source_file_path || null,
        // Extra extracted fields with no dedicated column are kept in raw_extract
        // (JSON) so nothing is lost — e.g. the previous policy number this policy renewed.
        raw_extract:
          r.previous_policy_number
            ? { previous_policy_number: r.previous_policy_number }
            : null,
      };
    })
    .filter((p): p is NonNullable<typeof p> => p !== null);

  // With the unique constraint dropped, we can safely bulk-insert everything.
  // The composite key deduplication (done earlier) already filtered out exact duplicates.
  let created = 0;
  let skippedConflict = 0;

  console.log(`[bulk] Starting insert of ${policyRows.length} policy rows`);

  // Helper: insert a chunk, transparently retrying without `mode` or `policy_holder_type` if those
  // columns don't exist yet, and falling back to row-by-row on any conflict.
  async function insertChunk(chunk: typeof policyRows): Promise<void> {
    let { error, count } = await db.from("policies").insert(chunk, { count: "exact" });

    // Handle missing mode/policy_holder_type columns gracefully
    if (error && (/mode/i.test(error.message) || /policy_holder_type/i.test(error.message)) && /column/i.test(error.message)) {
      console.log('[bulk] Column missing, retrying without mode/policy_holder_type');
      const chunkNoExtra = chunk.map(({ mode: _mode, policy_holder_type: _type, ...rest }) => rest);
      ({ error, count } = await db.from("policies").insert(chunkNoExtra, { count: "exact" }));
    }

    if (error) {
      console.error('[bulk] Chunk insert failed, falling back to row-by-row:', error.message);
      // Fall back to row-by-row so one bad row never blocks the rest.
      for (const row of chunk) {
        let { error: rowErr } = await db.from("policies").insert(row);
        if (rowErr && (/mode/i.test(rowErr.message) || /policy_holder_type/i.test(rowErr.message)) && /column/i.test(rowErr.message)) {
          const { mode: _mode, policy_holder_type: _type, ...rest } = row;
          ({ error: rowErr } = await db.from("policies").insert(rest));
        }
        if (rowErr) {
          console.error('[bulk] Row insert failed:', {
            policy_number: row.policy_number,
            client_id: row.client_id,
            error: rowErr.message,
            code: rowErr.code,
            hint: rowErr.hint
          });
          skippedConflict++;
        } else {
          created++;
        }
      }
      return;
    }
    created += count ?? chunk.length;
    console.log(`[bulk] Inserted chunk: ${count ?? chunk.length} policies`);
  }

  // Bulk-insert all rows in chunks of 500.
  for (let i = 0; i < policyRows.length; i += 500) {
    await insertChunk(policyRows.slice(i, i + 500));
  }
  
  console.log(`[bulk] Final result: ${created} created, ${skippedConflict} skipped`);

  await logActivity(
    agent,
    "bulk_import",
    `${created} policies, ${clientsCreated} new clients`,
    workspace
  );

  return NextResponse.json({
    ok: true,
    created,
    duplicates,
    skippedNoName,
    skippedConflict,
    clientsCreated,
    matched,
    attached,
    matchedClientName,
    matchedPolicyNumber,
  });
}
