import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentAgent } from "@/lib/auth";
import { ownerIdFor, permissionsFor, logActivity } from "@/lib/team";
import type { Workspace } from "@/lib/workspace";
import type { LicDueRow } from "@/lib/lic-premium-due";
import { getLicNextDueISO } from "@/lib/lic-renewal";

export const runtime = "nodejs";
export const maxDuration = 60;

interface LicBody {
  rows: LicDueRow[];
  source_file_path?: string | null;
}

/** Normalize a name for grouping/dedup (case + whitespace insensitive). */
function nameKey(name: string): string {
  return name.trim().toLowerCase().replace(/[.\s]+$/, "").replace(/\s+/g, " ");
}

/** "MM/YYYY" → sortable integer (year*12+month), or -1 when unknown. */
function reportMonthValue(mmYYYY: string | null | undefined): number {
  if (!mmYYYY) return -1;
  const m = mmYYYY.match(/^(\d{1,2})\/(\d{4})$/);
  if (!m) return -1;
  return Number(m[2]) * 12 + Number(m[1]);
}

interface ExistingPolicy {
  id: string;
  policy_number: string | null;
  raw_extract: Record<string, unknown> | null;
}

/**
 * Import an LIC "Premium Due List" into the active workspace.
 *
 * Dedup is by POLICY NUMBER only (within the owner + workspace): a policy is
 * stored exactly once no matter how many monthly reports list it. Re-uploading
 * a NEWER report refreshes the FUP / premium / due fields; an older report is
 * ignored so data never regresses. Clients are grouped by name.
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

  const body = (await request.json()) as LicBody;
  const rows = Array.isArray(body.rows) ? body.rows : [];
  if (rows.length === 0) {
    return NextResponse.json({ error: "No rows to import" }, { status: 400 });
  }

  const db = createAdminClient();
  const ownerId = ownerIdFor(agent);
  // LIC Premium Due Lists ALWAYS belong to the LIC workspace — never Home —
  // so the two dashboards can never mix, whatever page the upload happens on.
  const workspace: Workspace = "lic";

  const valid = rows.filter((r) => r.client_name && r.policy_number);
  const skippedNoName = rows.length - valid.length;

  // ---- Load existing clients (name → id) for this workspace. ----
  const clientIdByKey = new Map<string, string>();
  {
    let from = 0;
    const pageSize = 1000;
    for (;;) {
      const { data } = await db
        .from("clients")
        .select("id, full_name")
        .eq("agent_id", ownerId)
        .eq("workspace", workspace)
        .range(from, from + pageSize - 1);
      const batch = (data as { id: string; full_name: string }[]) || [];
      for (const c of batch) {
        const key = nameKey(c.full_name);
        if (!clientIdByKey.has(key)) clientIdByKey.set(key, c.id);
      }
      if (batch.length < pageSize) break;
      from += pageSize;
    }
  }

  // ---- Load existing policies (policy_number → row) for this workspace. ----
  const existingByNumber = new Map<string, ExistingPolicy>();
  {
    let from = 0;
    const pageSize = 1000;
    for (;;) {
      const { data } = await db
        .from("policies")
        .select("id, policy_number, raw_extract")
        .eq("agent_id", ownerId)
        .eq("workspace", workspace)
        .range(from, from + pageSize - 1);
      const batch = (data as ExistingPolicy[]) || [];
      for (const p of batch) {
        if (p.policy_number) existingByNumber.set(String(p.policy_number).trim(), p);
      }
      if (batch.length < pageSize) break;
      from += pageSize;
    }
  }

  // ---- Ensure a client exists for every name (create the missing ones). ----
  const displayNameByKey = new Map<string, string>();
  for (const r of valid) {
    const key = nameKey(r.client_name!);
    if (!displayNameByKey.has(key)) displayNameByKey.set(key, r.client_name!.trim());
  }
  const newClientRows = [...displayNameByKey.entries()]
    .filter(([key]) => !clientIdByKey.has(key))
    .map(([, name]) => ({ agent_id: ownerId, full_name: name, workspace }));

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

  // ---- Upsert each policy by policy number. ----
  const toInsert: Record<string, unknown>[] = [];
  const updates: { id: string; patch: Record<string, unknown> }[] = [];
  let duplicates = 0; // same policy number, not newer → left unchanged

  for (const r of valid) {
    const policyNumber = String(r.policy_number).trim();
    const clientId = clientIdByKey.get(nameKey(r.client_name!));
    if (!clientId) continue; // should not happen

    const rawExtract = {
      source: "lic_premium_due",
      fup: r.fup ?? null,
      fup_date: r.fup_date ?? r.renewal_date ?? null,
      inst_prem: r.inst_prem ?? r.premium ?? null,
      tot_prem: r.tot_prem ?? null,
      due_count: r.due_count ?? null,
      plan: r.plan ?? null,
      term: r.term ?? null,
      flag: r.flag ?? null,
      report_month: r.report_month ?? null,
    };

    const existing = existingByNumber.get(policyNumber);
    if (existing) {
      const oldMonth = reportMonthValue(
        (existing.raw_extract as { report_month?: string } | null)?.report_month
      );
      const newMonth = reportMonthValue(r.report_month);
      // Only refresh when the incoming report is the same or newer.
      if (newMonth < oldMonth) {
        duplicates++;
        continue;
      }
      updates.push({
        id: existing.id,
        patch: {
          client_id: clientId,
          company: "LIC",
          policy_type: r.policy_type ?? null,
          mode: r.mode ?? null,
          start_date: r.start_date ?? null,
          // Next due is derived purely from D.o.C + mode.
          renewal_date:
            getLicNextDueISO(r.start_date, r.mode) ?? r.renewal_date ?? null,
          premium: r.premium ?? null,
          // Preserve any existing markers (e.g. renewed_at) while refreshing.
          raw_extract: { ...(existing.raw_extract || {}), ...rawExtract },
        },
      });
      duplicates++; // counted as an existing policy (refreshed, not newly added)
      continue;
    }

    toInsert.push({
      agent_id: ownerId,
      client_id: clientId,
      workspace,
      company: "LIC",
      policy_type: r.policy_type ?? null,
      product_name: null,
      policy_number: policyNumber,
      sum_insured: null,
      premium: r.premium ?? null,
      mode: r.mode ?? null,
      start_date: r.start_date ?? null,
      // Next due is derived purely from D.o.C + mode.
      renewal_date:
        getLicNextDueISO(r.start_date, r.mode) ?? r.renewal_date ?? null,
      status: "active",
      source_file_path: body.source_file_path || null,
      raw_extract: rawExtract,
    });
    // Guard against the same new policy number appearing twice in one upload.
    existingByNumber.set(policyNumber, {
      id: "pending",
      policy_number: policyNumber,
      raw_extract: rawExtract,
    });
  }

  // Insert new policies in chunks.
  let created = 0;
  for (let i = 0; i < toInsert.length; i += 500) {
    const chunk = toInsert.slice(i, i + 500);
    const { error, count } = await db
      .from("policies")
      .insert(chunk, { count: "exact" });
    if (error) {
      // Fall back to row-by-row so one bad row never blocks the rest.
      for (const row of chunk) {
        const { error: rowErr } = await db.from("policies").insert(row);
        if (!rowErr) created++;
      }
    } else {
      created += count ?? chunk.length;
    }
  }

  // Apply refresh updates (bounded concurrency).
  for (let i = 0; i < updates.length; i += 25) {
    const chunk = updates.slice(i, i + 25);
    await Promise.all(
      chunk.map((u) =>
        db.from("policies").update(u.patch).eq("id", u.id).eq("agent_id", ownerId)
      )
    );
  }

  await logActivity(
    agent,
    "bulk_import",
    `LIC: ${created} new, ${updates.length} refreshed`,
    workspace
  );

  return NextResponse.json({
    ok: true,
    created,
    duplicates,
    skippedNoName,
    skippedConflict: 0,
    clientsCreated,
  });
}
