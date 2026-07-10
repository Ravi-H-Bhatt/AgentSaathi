import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentAgent } from "@/lib/auth";
import { ownerIdFor, permissionsFor, logActivity } from "@/lib/team";
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
      .eq("agent_id", ownerId);
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
  const existingKeys = new Set<string>();
  {
    let from = 0;
    const pageSize = 1000;
    for (;;) {
      const { data } = await db
        .from("policies")
        .select(
          "policy_number, product_name, policy_type, premium, sum_insured, start_date, renewal_date, client_id"
        )
        .eq("agent_id", ownerId)
        .range(from, from + pageSize - 1);
      const batch = (data as any[]) || [];
      if (batch.length === 0) break;
      for (const p of batch) {
        const cname = clientNameById.get(p.client_id) || "";
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

  // ---- 2. Filter incoming rows: keep only those NOT already in DB and not
  //         exact duplicates within this same upload. ----
  const seenInFile = new Set<string>();
  const toImport = valid.filter((r) => {
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
    if (existingKeys.has(key) || seenInFile.has(key)) return false;
    seenInFile.add(key);
    return true;
  });
  const duplicates = valid.length - toImport.length;

  if (toImport.length === 0) {
    return NextResponse.json({
      ok: true,
      created: 0,
      duplicates,
      skippedNoName,
      skippedConflict: 0,
      clientsCreated: 0,
      message: "Nothing new to import — all policies already exist.",
    });
  }

  // ---- 2. Resolve clients: reuse existing, create the rest (one per name). ----
  // (clientIdByKey already loaded above during dedup key building.)
  const groupKeys = [...new Set(toImport.map((r) => nameKey(r.client_name!)))];

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
      const clientId = clientIdByKey.get(nameKey(r.client_name!));
      if (!clientId) return null;
      return {
        agent_id: ownerId,
        client_id: clientId,
        company: null as string | null,
        policy_type: r.policy_type,
        product_name: r.product_name || null,
        client_address: r.client_address || null,
        policy_number: r.policy_number,
        sum_insured: r.sum_insured,
        premium: r.premium,
        mode: r.mode,
        start_date: r.start_date,
        renewal_date: r.renewal_date,
        source_file_path: body.source_file_path || null,
      };
    })
    .filter((p): p is NonNullable<typeof p> => p !== null);

  // ---- 4. Pre-fetch existing non-null policy_numbers so we know which rows
  //         could hit the legacy unique constraint (agent_id, policy_number). ----
  const existingPolicyNumbers = new Set<string>();
  {
    let from = 0;
    const pageSize = 1000;
    for (;;) {
      const { data } = await db
        .from("policies")
        .select("policy_number")
        .eq("agent_id", ownerId)
        .not("policy_number", "is", null)
        .range(from, from + pageSize - 1);
      const batch = (data as { policy_number: string | null }[]) || [];
      if (batch.length === 0) break;
      for (const p of batch) if (p.policy_number) existingPolicyNumbers.add(p.policy_number);
      if (batch.length < pageSize) break;
      from += pageSize;
    }
  }

  // Split rows into SAFE (guaranteed insertable) and RISKY (may collide on the
  // legacy unique constraint). SAFE = no policy_number (constraint allows NULL)
  // OR a policy_number not already in the DB and not seen earlier this batch.
  const numbersSeenThisBatch = new Set<string>();
  const safeRows: typeof policyRows = [];
  const riskyRows: typeof policyRows = [];
  for (const row of policyRows) {
    const num = row.policy_number;
    if (!num) {
      safeRows.push(row); // NULL policy_number never violates the constraint.
      continue;
    }
    if (existingPolicyNumbers.has(num) || numbersSeenThisBatch.has(num)) {
      riskyRows.push(row); // Would collide → handle individually.
    } else {
      numbersSeenThisBatch.add(num);
      safeRows.push(row);
    }
  }

  let created = 0;
  let skippedConflict = 0;

  // Helper: insert a chunk, transparently retrying without `mode` if that
  // column doesn't exist yet, and falling back to row-by-row on any conflict.
  async function insertChunk(chunk: typeof policyRows): Promise<void> {
    let { error, count } = await db.from("policies").insert(chunk, { count: "exact" });

    if (error && /mode/i.test(error.message) && /column/i.test(error.message)) {
      const chunkNoMode = chunk.map(({ mode: _mode, ...rest }) => rest);
      ({ error, count } = await db.from("policies").insert(chunkNoMode, { count: "exact" }));
    }

    if (error) {
      // Fall back to row-by-row so one bad row never blocks the rest.
      for (const row of chunk) {
        let { error: rowErr } = await db.from("policies").insert(row);
        if (rowErr && /mode/i.test(rowErr.message) && /column/i.test(rowErr.message)) {
          const { mode: _mode, ...rest } = row;
          ({ error: rowErr } = await db.from("policies").insert(rest));
        }
        if (rowErr) skippedConflict++;
        else created++;
      }
      return;
    }
    created += count ?? chunk.length;
  }

  // Bulk-insert all SAFE rows (this covers every no-number policy + all uniques).
  for (let i = 0; i < safeRows.length; i += 500) {
    await insertChunk(safeRows.slice(i, i + 500));
  }

  // RISKY rows: insert one-by-one. If the constraint still exists they are
  // skipped safely; once the constraint is dropped they insert fine.
  for (const row of riskyRows) {
    let { error: rowErr } = await db.from("policies").insert(row);
    if (rowErr && /mode/i.test(rowErr.message) && /column/i.test(rowErr.message)) {
      const { mode: _mode, ...rest } = row;
      ({ error: rowErr } = await db.from("policies").insert(rest));
    }
    if (rowErr) skippedConflict++;
    else created++;
  }

  await logActivity(
    agent,
    "bulk_import",
    `${created} policies, ${clientsCreated} new clients`
  );

  return NextResponse.json({
    ok: true,
    created,
    duplicates,
    skippedNoName,
    skippedConflict,
    clientsCreated,
  });
}
