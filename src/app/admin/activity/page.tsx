import { redirect } from "next/navigation";
import { getCurrentAgent } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { Activity } from "lucide-react";

interface ActivityLog {
  id: string;
  agent_id: string;
  owner_id: string;
  action: string;
  detail: string | null;
  created_at: string;
  agent?: {
    email: string;
    full_name: string | null;
  };
  owner?: {
    email: string;
    full_name: string | null;
  };
}

export default async function ActivityLogsPage() {
  const agent = await getCurrentAgent();
  if (!agent || agent.role !== "admin") redirect("/dashboard");

  const db = createAdminClient();
  
  // Get recent activity logs with agent and owner details
  const { data: logs } = await db
    .from("activity_log")
    .select(`
      id,
      agent_id,
      owner_id,
      action,
      detail,
      created_at
    `)
    .order("created_at", { ascending: false })
    .limit(500);

  // Get unique agent IDs
  const agentIds = new Set<string>();
  logs?.forEach((log) => {
    agentIds.add(log.agent_id);
    agentIds.add(log.owner_id);
  });

  // Fetch agent details
  const { data: agents } = await db
    .from("agents")
    .select("id, email, full_name")
    .in("id", Array.from(agentIds));

  const agentMap = new Map(agents?.map((a) => [a.id, a]) || []);

  const enrichedLogs: ActivityLog[] =
    logs?.map((log) => ({
      ...log,
      agent: agentMap.get(log.agent_id),
      owner: agentMap.get(log.owner_id),
    })) || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Activity size={28} />
          Activity Logs
        </h1>
        <p className="text-muted mt-1">
          Monitor all actions by agents and colleagues
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-black/[.02] border-b border-border">
              <tr className="text-left text-xs text-muted uppercase tracking-wide">
                <th className="px-4 py-3 font-semibold">Time</th>
                <th className="px-4 py-3 font-semibold">Actor</th>
                <th className="px-4 py-3 font-semibold">Owner</th>
                <th className="px-4 py-3 font-semibold">Action</th>
                <th className="px-4 py-3 font-semibold">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {enrichedLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted">
                    No activity logs yet
                  </td>
                </tr>
              ) : (
                enrichedLogs.map((log) => {
                  const timestamp = new Date(log.created_at);
                  const isRecent =
                    Date.now() - timestamp.getTime() < 5 * 60 * 1000; // 5 min

                  return (
                    <tr
                      key={log.id}
                      className={`hover:bg-black/[.02] ${
                        isRecent ? "bg-blue-50/50" : ""
                      }`}
                    >
                      <td className="px-4 py-3 text-xs text-muted whitespace-nowrap">
                        {timestamp.toLocaleString("en-IN", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                          hour12: true,
                        })}
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <div className="font-medium">
                            {log.agent?.full_name || "Unknown"}
                          </div>
                          <div className="text-xs text-muted">
                            {log.agent?.email}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm">
                          {log.owner?.full_name || log.owner?.email || "—"}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-block px-2 py-1 rounded-md text-xs font-medium bg-black/[.06]">
                          {log.action}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted max-w-md truncate">
                        {log.detail || "—"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="text-xs text-muted text-center">
        Showing last 500 activity entries
      </div>
    </div>
  );
}
