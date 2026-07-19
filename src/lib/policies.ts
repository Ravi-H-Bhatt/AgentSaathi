import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { computeAge } from "@/lib/premium";
import type { Workspace } from "@/lib/workspace";

export interface SavePolicyInput {
  client_name: string;
  client_email?: string | null;
  client_phone?: string | null;
  date_of_birth?: string | null;
  age?: number | null;
  company?: string | null;
  policy_type?: string | null;
  policy_number?: string | null;
  sum_insured?: number | null;
  premium?: number | null;
  start_date?: string | null;
  renewal_date?: string | null;
  source_file_path?: string | null;
  existing_client_id?: string | null;
}

export interface SavePolicyResult {
  ok: true;
  clientId: string;
  policyId: string;
  duplicate?: boolean;
}

function numOrNull(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return isNaN(n) ? null : n;
}

function dateOrNull(v: unknown): string | null {
  if (!v || typeof v !== "string") return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : v;
}

/**
 * Create (or reuse) a client and attach a policy — with full deduplication.
 * Shared by the single-upload route and the multi-file bundle route so every
 * policy is stored in Supabase the same, correct way.
 *
 * Dedup rules:
 *  - A policy number is globally unique per owner. Re-uploading the same PDF
 *    (same number) is a no-op and returns the existing policy.
 *  - When there's no number, an all-fields-identical policy on the same client
 *    is treated as a duplicate.
 *  - Clients are reused by (owner + name [+ DOB/email]) so one person doesn't
 *    get duplicated on every upload.
 */
export async function savePolicyForOwner(
  ownerId: string,
  body: SavePolicyInput,
  workspace: Workspace
): Promise<SavePolicyResult> {
  if (!body.client_name || !body.client_name.trim()) {
    throw new Error("Client name is required");
  }

  const db = createAdminClient();
  let clientId = body.existing_client_id || null;

  const dob = dateOrNull(body.date_of_birth);
  const age =
    numOrNull(body.age) ??
    (dob ? computeAge({ date_of_birth: dob, age: null }) : null);

  if (!clientId) {
    // Reuse an existing client (same owner + name). For fuzzy matching we check:
    // 1. Exact name match (case-insensitive)
    // 2. DOB match if provided
    // 3. Email match if provided
    // 4. Phone match if provided (last resort)
    const findClient = db
      .from("clients")
      .select("id, full_name, date_of_birth, email, phone")
      .eq("agent_id", ownerId)
      .eq("workspace", workspace)
      .ilike("full_name", body.client_name.trim());

    const { data: candidates } = await findClient;
    if (candidates && candidates.length > 0) {
      // Try exact match first (name + DOB/email)
      let match = candidates.find((c) => {
        if (dob && c.date_of_birth && c.date_of_birth === dob) return true;
        if (
          body.client_email &&
          c.email &&
          c.email.toLowerCase() === body.client_email.toLowerCase()
        )
          return true;
        return false;
      });
      // Fallback: phone match
      if (!match && body.client_phone) {
        match = candidates.find(
          (c) =>
            c.phone &&
            c.phone.replace(/\D/g, "") === body.client_phone!.replace(/\D/g, "")
        );
      }
      // Fallback: first candidate (name-only match)
      if (!match && candidates.length === 1) match = candidates[0];
      if (match) clientId = match.id;
    }
  }

  if (!clientId) {
    const { data: client, error: cErr } = await db
      .from("clients")
      .insert({
        agent_id: ownerId,
        full_name: body.client_name.trim(),
        email: body.client_email || null,
        phone: body.client_phone || null,
        date_of_birth: dob,
        age,
        workspace,
      })
      .select("id")
      .single();
    if (cErr || !client) {
      throw new Error("Failed to create client: " + (cErr?.message || ""));
    }
    clientId = client.id;
  }

  const company = body.company || null;
  const policyType = body.policy_type || null;
  const policyNumber = body.policy_number || null;
  const sumInsured = numOrNull(body.sum_insured);
  const premium = numOrNull(body.premium);
  const startDate = dateOrNull(body.start_date);
  const renewalDate = dateOrNull(body.renewal_date);

  // Strong dedup by globally-unique policy number.
  if (policyNumber) {
    const { data: byNumber } = await db
      .from("policies")
      .select("id, client_id")
      .eq("agent_id", ownerId)
      .eq("workspace", workspace)
      .eq("policy_number", policyNumber)
      .limit(1)
      .maybeSingle();
    if (byNumber) {
      return {
        ok: true,
        clientId: byNumber.client_id || clientId,
        policyId: byNumber.id,
        duplicate: true,
      };
    }
  }

  // Field-by-field dedup for numberless policies.
  let dupQuery = db
    .from("policies")
    .select("id")
    .eq("agent_id", ownerId)
    .eq("workspace", workspace)
    .eq("client_id", clientId);

  const dupFields = {
    company,
    policy_type: policyType,
    policy_number: policyNumber,
    sum_insured: sumInsured,
    premium,
    start_date: startDate,
    renewal_date: renewalDate,
  } as const;

  for (const [col, val] of Object.entries(dupFields)) {
    dupQuery = val === null ? dupQuery.is(col, null) : dupQuery.eq(col, val);
  }

  const { data: existing } = await dupQuery.limit(1).maybeSingle();
  if (existing) {
    return { ok: true, clientId: clientId!, policyId: existing.id, duplicate: true };
  }

  const { data: policy, error: pErr } = await db
    .from("policies")
    .insert({
      agent_id: ownerId,
      client_id: clientId,
      company,
      policy_type: policyType,
      policy_number: policyNumber,
      sum_insured: sumInsured,
      premium,
      start_date: startDate,
      renewal_date: renewalDate,
      source_file_path: body.source_file_path || null,
      workspace,
    })
    .select("id")
    .single();

  if (pErr || !policy) {
    throw new Error("Failed to create policy: " + (pErr?.message || ""));
  }

  return { ok: true, clientId: clientId!, policyId: policy.id };
}
