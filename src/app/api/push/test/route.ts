import { NextResponse } from "next/server";
import { getCurrentAgent } from "@/lib/auth";
import { sendPushToAgent } from "@/lib/push";

export const runtime = "nodejs";

/** Send a test notification to all the current agent's devices. */
export async function POST() {
  const agent = await getCurrentAgent();
  if (!agent || agent.status !== "approved") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { sent, failed } = await sendPushToAgent(agent.id, {
    title: "AgentSaathi",
    body: "Notifications are on. You'll get renewal reminders here.",
    url: "/dashboard",
    tag: "test",
  });

  if (sent === 0 && failed === 0) {
    return NextResponse.json(
      { error: "No devices subscribed, or push is not configured." },
      { status: 400 }
    );
  }
  return NextResponse.json({ ok: true, sent, failed });
}
