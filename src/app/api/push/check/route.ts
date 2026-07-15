import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentAgent } from "@/lib/auth";

export const runtime = "nodejs";

/** GET /api/push/check — Check current user's push subscriptions */
export async function GET() {
  const agent = await getCurrentAgent();
  if (!agent || agent.status !== "approved") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = createAdminClient();
  const { data: subs, error } = await db
    .from("push_subscriptions")
    .select("id, endpoint, user_agent, created_at")
    .eq("agent_id", agent.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    count: subs?.length || 0,
    subscriptions: subs || [],
  });
}
