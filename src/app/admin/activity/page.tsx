import { redirect } from "next/navigation";
import { getCurrentAgent } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { ActivityLogTable } from "@/components/ActivityLogTable";
import type { ActivityLogItem } from "@/app/api/admin/activity/route";

export const dynamic = "force-dynamic";

export default async function ActivityLogsPage() {
  const agent = await getCurrentAgent();
  if (!agent || agent.role !== "admin") redirect("/dashboard");

  const db = createAdminClient();

  // Initial server render — the client component keeps this live via polling.
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

  const initialLogs: ActivityLogItem[] =
    logs?.map((log) => ({
      ...log,
      agent: agentMap.get(log.agent_id),
      owner: agentMap.get(log.owner_id),
    })) || [];

  return <ActivityLogTable initialLogs={initialLogs} />;
}
