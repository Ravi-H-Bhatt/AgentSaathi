import { createAdminClient } from "@/lib/supabase/admin";
import { shortDate } from "@/lib/format";
import { getMaintenance } from "@/lib/settings";
import { AgentRow } from "@/components/AgentRow";
import { MaintenanceToggle } from "@/components/MaintenanceToggle";
import type { Agent } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AdminAgentsPage() {
  const db = createAdminClient();
  const { data } = await db
    .from("agents")
    .select("*")
    .eq("role", "agent")
    .order("created_at", { ascending: false });

  const agents = (data as Agent[]) || [];
  const pending = agents.filter((a) => a.status === "pending");
  const others = agents.filter((a) => a.status !== "pending");

  let maintenance = { active: false, message: null as string | null };
  try {
    maintenance = await getMaintenance();
  } catch {
    /* settings table may not exist yet */
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Agents</h1>
        <p className="text-muted mt-1">
          Approve agents before they can access the dashboard.
        </p>
      </div>

      <MaintenanceToggle
        initialActive={maintenance.active}
        initialMessage={maintenance.message}
      />

      <section>
        <h2 className="font-semibold mb-3">
          Pending approval{" "}
          <span className="text-muted font-normal">({pending.length})</span>
        </h2>
        {pending.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card py-10 text-center text-muted text-sm">
            No agents waiting for approval.
          </div>
        ) : (
          <div className="rounded-2xl border border-border bg-card divide-y divide-border overflow-hidden">
            {pending.map((a) => (
              <AgentRow
                key={a.id}
                id={a.id}
                name={a.full_name}
                email={a.email}
                status={a.status}
                signedUp={shortDate(a.created_at)}
              />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="font-semibold mb-3">
          All agents{" "}
          <span className="text-muted font-normal">({others.length})</span>
        </h2>
        {others.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card py-10 text-center text-muted text-sm">
            No approved or rejected agents yet.
          </div>
        ) : (
          <div className="rounded-2xl border border-border bg-card divide-y divide-border overflow-hidden">
            {others.map((a) => (
              <AgentRow
                key={a.id}
                id={a.id}
                name={a.full_name}
                email={a.email}
                status={a.status}
                signedUp={shortDate(a.created_at)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
