import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentAgent } from "@/lib/auth";
import { ownerIdFor } from "@/lib/team";
import { sendPushToAgent } from "@/lib/push";

export const runtime = "nodejs";

/** POST /api/report — an agent or colleague reports an error/issue. */
export async function POST(request: NextRequest) {
  const agent = await getCurrentAgent();
  if (!agent || agent.status !== "approved") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { message, page } = await request.json();
  if (!message?.trim()) {
    return NextResponse.json({ error: "Please describe the issue." }, { status: 400 });
  }

  const db = createAdminClient();
  const { error } = await db.from("error_reports").insert({
    reporter_id: agent.id,
    reporter_name: agent.full_name || agent.email,
    reporter_email: agent.email,
    owner_id: ownerIdFor(agent),
    message: message.trim().slice(0, 2000),
    page: page?.toString().slice(0, 200) || null,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  
  // Send push notification to every approved admin (across all their devices).
  // Uses the shared, correctly-configured web-push helper so the payload shape
  // matches the service worker (which reads `url` at the top level) and dead
  // subscriptions are pruned automatically.
  try {
    const { data: admins } = await db
      .from("agents")
      .select("id")
      .eq("role", "admin")
      .eq("status", "approved");

    const reporter = agent.full_name || agent.email;
    let sent = 0;
    for (const a of admins || []) {
      const res = await sendPushToAgent(a.id, {
        title: "🚨 New issue reported",
        body: `${reporter}: ${message.trim().slice(0, 120)}`,
        url: "/admin/reports",
        tag: "error-report",
      });
      sent += res.sent;
    }
    console.log(
      `[report] admin push: ${admins?.length || 0} admin(s), ${sent} device(s) notified`
    );
  } catch (err) {
    console.error("[report] Failed to send admin notification:", err);
    // Don't fail the request if notification fails
  }

  return NextResponse.json({ ok: true });
}
