import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentAgent } from "@/lib/auth";
import { ownerIdFor, permissionsFor, logActivity } from "@/lib/team";
import { sendRenewalEmail } from "@/lib/email";
import type { Client, Policy } from "@/lib/types";

export const runtime = "nodejs";

/** Manually send a renewal reminder for one policy. */
export async function POST(request: NextRequest) {
  const agent = await getCurrentAgent();
  if (!agent || agent.status !== "approved") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!permissionsFor(agent).email) {
    return NextResponse.json(
      { error: "You don't have permission to send reminders." },
      { status: 403 }
    );
  }

  const { policyId } = await request.json();
  if (!policyId) {
    return NextResponse.json({ error: "Missing policyId" }, { status: 400 });
  }

  const db = createAdminClient();
  const ownerId = ownerIdFor(agent);
  const { data: policy } = await db
    .from("policies")
    .select("*")
    .eq("id", policyId)
    .eq("agent_id", ownerId)
    .maybeSingle();

  if (!policy) {
    return NextResponse.json({ error: "Policy not found" }, { status: 404 });
  }

  const { data: client } = await db
    .from("clients")
    .select("*")
    .eq("id", (policy as Policy).client_id)
    .maybeSingle();

  if (!client) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }
  if (!(client as Client).email) {
    return NextResponse.json(
      { error: "This client has no email address on file." },
      { status: 400 }
    );
  }

  const to = (client as Client).email!;
  const subject = `Renewal reminder: ${(policy as Policy).policy_type || "policy"}`;

  try {
    await sendRenewalEmail({
      to,
      client: client as Client,
      policy: policy as Policy,
      agentName: agent.full_name || "Your insurance agent",
    });
    await db.from("email_log").insert({
      agent_id: ownerId,
      client_id: (client as Client).id,
      policy_id: (policy as Policy).id,
      to_email: to,
      subject,
      status: "sent",
    });
    await logActivity(
      agent,
      "send_email",
      `${(client as Client).full_name} (${to})`
    );
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    await db.from("email_log").insert({
      agent_id: ownerId,
      client_id: (client as Client).id,
      policy_id: (policy as Policy).id,
      to_email: to,
      subject,
      status: "failed",
      error: msg,
    });
    return NextResponse.json(
      { error: "Failed to send email: " + msg },
      { status: 500 }
    );
  }
}
