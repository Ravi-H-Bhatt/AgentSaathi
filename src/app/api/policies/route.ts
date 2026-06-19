import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentAgent } from "@/lib/auth";
import { ownerIdFor, permissionsFor } from "@/lib/team";
import { computeAge } from "@/lib/premium";

export const runtime = "nodejs";

interface SaveBody {
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

  const body = (await request.json()) as SaveBody;
  if (!body.client_name || !body.client_name.trim()) {
    return NextResponse.json({ error: "Client name is required" }, { status: 400 });
  }

  const db = createAdminClient();
  const ownerId = ownerIdFor(agent);
  let clientId = body.existing_client_id || null;

  const dob = dateOrNull(body.date_of_birth);
  const age =
    numOrNull(body.age) ??
    (dob ? computeAge({ date_of_birth: dob, age: null }) : null);

  if (!clientId) {
    // Reuse an existing client (same owner + name, and matching DOB/email when
    // present) instead of creating a duplicate person on every upload.
    let findClient = db
      .from("clients")
      .select("id")
      .eq("agent_id", ownerId)
      .ilike("full_name", body.client_name.trim());
    if (dob) findClient = findClient.eq("date_of_birth", dob);
    if (body.client_email)
      findClient = findClient.ilike("email", body.client_email);
    const { data: match } = await findClient.limit(1).maybeSingle();
    if (match) clientId = match.id;
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
      })
      .select("id")
      .single();
    if (cErr || !client) {
      return NextResponse.json(
        { error: "Failed to create client: " + (cErr?.message || "") },
        { status: 500 }
      );
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

  // Deduplication: skip storing a policy that is identical to one the same
  // client already has. We compare every meaningful field, so only truly
  // unique policies get inserted — re-uploading the same document is a no-op.
  let dupQuery = db
    .from("policies")
    .select("id")
    .eq("agent_id", ownerId)
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
    // `.is()` for null comparisons, `.eq()` otherwise — so a record with a
    // null field only matches another null field, not any value.
    dupQuery = val === null ? dupQuery.is(col, null) : dupQuery.eq(col, val);
  }

  const { data: existing } = await dupQuery.limit(1).maybeSingle();

  if (existing) {
    return NextResponse.json({
      ok: true,
      clientId,
      policyId: existing.id,
      duplicate: true,
    });
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
    })
    .select("id")
    .single();

  if (pErr || !policy) {
    return NextResponse.json(
      { error: "Failed to create policy: " + (pErr?.message || "") },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, clientId, policyId: policy.id });
}
