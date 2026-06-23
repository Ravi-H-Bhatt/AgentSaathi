import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendRenewalEmail } from "@/lib/email";
import { sendPushToAgent } from "@/lib/push";
import type { Agent, Client, Policy } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Automated renewal reminders. Intended to be hit by a scheduler
 * (e.g. Vercel Cron). Sends reminders for policies renewing within
 * the next N days (default 30) that haven't been reminded in 14 days.
 * Protected by CRON_SECRET (Authorization: Bearer <secret>).
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (secret && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const windowDays = Number(
    new URL(request.url).searchParams.get("days") || 30
  );
  const today = new Date();
  const until = new Date();
  until.setDate(today.getDate() + windowDays);

  const db = createAdminClient();
  const { data: policies } = await db
    .from("policies")
    .select("*")
    .gte("renewal_date", today.toISOString().slice(0, 10))
    .lte("renewal_date", until.toISOString().slice(0, 10));

  const list = (policies as Policy[]) || [];
  let sent = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const policy of list) {
    const { data: client } = await db
      .from("clients")
      .select("*")
      .eq("id", policy.client_id)
      .maybeSingle();
    if (!client || !(client as Client).email) {
      skipped++;
      continue;
    }

    // Skip if reminded within the last 14 days.
    const since = new Date();
    since.setDate(since.getDate() - 14);
    const { count } = await db
      .from("email_log")
      .select("id", { count: "exact", head: true })
      .eq("policy_id", policy.id)
      .eq("status", "sent")
      .gte("sent_at", since.toISOString());
    if ((count || 0) > 0) {
      skipped++;
      continue;
    }

    const { data: agent } = await db
      .from("agents")
      .select("*")
      .eq("id", policy.agent_id)
      .maybeSingle();

    try {
      await sendRenewalEmail({
        to: (client as Client).email!,
        client: client as Client,
        policy,
        agentName: (agent as Agent)?.full_name || "Your insurance agent",
      });
      await db.from("email_log").insert({
        agent_id: policy.agent_id,
        client_id: policy.client_id,
        policy_id: policy.id,
        to_email: (client as Client).email!,
        subject: `Renewal reminder: ${policy.policy_type || "policy"}`,
        status: "sent",
      });
      // Notify the owner AND all colleagues that a renewal is coming up.
      const { data: team } = await db
        .from("agents")
        .select("id")
        .eq("status", "approved")
        .or(`id.eq.${policy.agent_id},parent_agent_id.eq.${policy.agent_id}`);
      
      for (const t of (team as { id: string }[]) || []) {
        await sendPushToAgent(t.id, {
          title: "Renewal coming up",
          body: `${(client as Client).full_name}'s ${
            policy.policy_type || "policy"
          } renews on ${policy.renewal_date}.`,
          url: `/clients/${policy.client_id}`,
          tag: `renewal-${policy.id}`,
        });
      }
      sent++;
    } catch (e) {
      errors.push(policy.id + ": " + (e instanceof Error ? e.message : "error"));
    }
  }

  return NextResponse.json({ processed: list.length, sent, skipped, errors });
}
