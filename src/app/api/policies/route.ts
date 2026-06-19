import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentAgent } from "@/lib/auth";
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

  const body = (await request.json()) as SaveBody;
  if (!body.client_name || !body.client_name.trim()) {
    return NextResponse.json({ error: "Client name is required" }, { status: 400 });
  }

  const db = createAdminClient();
  let clientId = body.existing_client_id || null;

  const dob = dateOrNull(body.date_of_birth);
  const age =
    numOrNull(body.age) ??
    (dob ? computeAge({ date_of_birth: dob, age: null }) : null);

  if (!clientId) {
    const { data: client, error: cErr } = await db
      .from("clients")
      .insert({
        agent_id: agent.id,
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

  const { data: policy, error: pErr } = await db
    .from("policies")
    .insert({
      agent_id: agent.id,
      client_id: clientId,
      company: body.company || null,
      policy_type: body.policy_type || null,
      policy_number: body.policy_number || null,
      sum_insured: numOrNull(body.sum_insured),
      premium: numOrNull(body.premium),
      start_date: dateOrNull(body.start_date),
      renewal_date: dateOrNull(body.renewal_date),
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
