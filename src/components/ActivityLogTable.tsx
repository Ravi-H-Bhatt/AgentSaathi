"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Activity, RefreshCw } from "lucide-react";
import type { ActivityLogItem } from "@/app/api/admin/activity/route";

/** Human label for a workspace (inlined so this client module stays server-free). */
function workspaceLabel(w: string | null | undefined): string {
  return w === "lic" ? "LIC" : "Home";
}

/**
 * Live activity feed for admins. Seeds with server-rendered data, then polls
 * /api/admin/activity every 10s so new actions appear without a manual refresh
 * — including inside the installed PWA (the API route is never cached).
 */
export function ActivityLogTable({ initialLogs }: { initialLogs: ActivityLogItem[] }) {
  const [logs, setLogs] = useState<ActivityLogItem[]>(initialLogs);
  const [refreshing, setRefreshing] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const mounted = useRef(true);

  const load = useCallback(async () => {
    try {
      setRefreshing(true);
      const res = await fetch("/api/admin/activity", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as { logs: ActivityLogItem[] };
      if (mounted.current && Array.isArray(data.logs)) {
        setLogs(data.logs);
        setUpdatedAt(new Date());
      }
    } catch {
      // Ignore transient network errors; next poll will retry.
    } finally {
      if (mounted.current) setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    // Refresh immediately on mount, then poll.
    load();
    const interval = setInterval(load, 10000);
    return () => {
      mounted.current = false;
      clearInterval(interval);
    };
  }, [load]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Activity size={28} />
            Activity Logs
          </h1>
          <p className="text-muted mt-1">
            Monitor all actions by agents and colleagues
          </p>
        </div>
        <button
          onClick={load}
          disabled={refreshing}
          className="inline-flex items-center gap-2 text-sm font-medium px-3.5 py-2 rounded-full border border-border hover:bg-black/[.03] transition disabled:opacity-60 shrink-0"
        >
          <RefreshCw size={15} className={refreshing ? "animate-spin" : ""} />
          {refreshing ? "Updating…" : "Live"}
        </button>
      </div>

      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-black/[.02] border-b border-border">
              <tr className="text-left text-xs text-muted uppercase tracking-wide">
                <th className="px-4 py-3 font-semibold">Time</th>
                <th className="px-4 py-3 font-semibold">Actor</th>
                <th className="px-4 py-3 font-semibold">Owner</th>
                <th className="px-4 py-3 font-semibold">Workspace</th>
                <th className="px-4 py-3 font-semibold">Action</th>
                <th className="px-4 py-3 font-semibold">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted">
                    No activity logs yet
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
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
                          timeZone: "Asia/Kolkata",
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
                        <span
                          className={`inline-block px-2 py-1 rounded-md text-xs font-medium ${
                            log.workspace === "lic"
                              ? "bg-purple-100 text-purple-700"
                              : "bg-black/[.06]"
                          }`}
                        >
                          {workspaceLabel(log.workspace)}
                        </span>
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
        Showing last {logs.length} activity entries
        {updatedAt && (
          <>
            {" · "}updated{" "}
            {updatedAt.toLocaleTimeString("en-IN", {
              timeZone: "Asia/Kolkata",
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
              hour12: true,
            })}
          </>
        )}
      </div>
    </div>
  );
}
