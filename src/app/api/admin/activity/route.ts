import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentAgent } from "@/lib/auth";

export const runtime = "nodejs";
// Never cache — always return the freshest logs (also keeps the installed PWA live).
export const dynamic = "force-dynamic";

export interface ActivityLogItem {
  id: string;
  agent_id: string;
  owner_id: string;
  action: string;
  detail: string | null;
  workspace: string | null;
  created_at: string;
  agent?: { email: string; full_name: string | null };
  owner?: { email: string; full_name: string | null };
}

/**
 * Admin-only feed of recent activity, returned as JSON so the client can poll
 * for live updates without a full page refresh (works in the installed PWA
 * too, since /api/* is excluded from the service-worker cache).
 * GET /api/admin/activity
 */
export async function GET() {
  const agent = await getCurrentAgent();
  if (!agent || agent.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = createAdminClient();

  const { data: logs } = await db
    .from("activity_log")
    .select("id, agent_id, owner_id, action, detail, workspace, created_at")
    .order("created_at", { ascending: false })
    .limit(500);

  const agentIds = new Set<string>();
  logs?.forEach((log) => {
    agentIds.add(log.agent_id);
    agentIds.add(log.owner_id);
  });

  const { data: agents } = await db
    .from("agents")
    .select("id, email, full_name")
    .in("id", Array.from(agentIds));

  const agentMap = new Map(agents?.map((a) => [a.id, a]) || []);

  const items: ActivityLogItem[] =
    logs?.map((log) => ({
      ...log,
      agent: agentMap.get(log.agent_id),
      owner: agentMap.get(log.owner_id),
    })) || [];

  return NextResponse.json({ logs: items });
}
