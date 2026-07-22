import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentAgent } from "@/lib/auth";

export const runtime = "nodejs";
// Never cache — the watcher must see status changes within seconds (incl. PWA).
export const dynamic = "force-dynamic";

/**
 * Live access check for the signed-in user.
 *   - Signed out / missing agent          → revoked
 *   - Admin                               → allowed
 *   - Own status not "approved"           → revoked
 *   - Colleague whose PARENT is revoked   → revoked
 * Used by <AccessWatcher/> to show the "access revoked" screen the moment an
 * admin revokes an agent — for that agent AND all their colleagues.
 */
export async function GET() {
  const agent = await getCurrentAgent();
  if (!agent) return NextResponse.json({ revoked: true });
  if (agent.role === "admin") return NextResponse.json({ revoked: false });
  if (agent.status !== "approved") return NextResponse.json({ revoked: true });

  if (agent.parent_agent_id) {
    const db = createAdminClient();
    const { data: parent } = await db
      .from("agents")
      .select("status")
      .eq("id", agent.parent_agent_id)
      .maybeSingle();
    if (!parent || parent.status !== "approved") {
      return NextResponse.json({ revoked: true });
    }
  }

  return NextResponse.json({ revoked: false });
}
