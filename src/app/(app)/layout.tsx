import { redirect } from "next/navigation";
import { getCurrentAgent } from "@/lib/auth";
import { getOpenTimeEntry } from "@/lib/data";
import { getMaintenance } from "@/lib/settings";
import { permissionsFor, isColleague } from "@/lib/team";
import { AppShell } from "@/components/AppShell";
import { MaintenanceScreen } from "@/components/MaintenanceScreen";

// Authenticated area depends on the request session — never prerender.
export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const agent = await getCurrentAgent();
  if (!agent) redirect("/login");
  if (agent.role === "admin") redirect("/admin");
  if (agent.status !== "approved") redirect("/pending");

  // Global "work in progress" mode — blocks all agents/colleagues (not admin,
  // who lives under /admin). Auto-recovers when the admin turns it off.
  const maintenance = await getMaintenance();
  if (maintenance.active) {
    return <MaintenanceScreen message={maintenance.message} />;
  }

  const openEntry = await getOpenTimeEntry(agent.id);

  return (
    <AppShell
      agentName={agent.full_name || agent.email}
      agentEmail={agent.email}
      agentId={agent.id}
      isColleague={isColleague(agent)}
      permissions={permissionsFor(agent)}
      openSince={openEntry?.clock_in ?? null}
    >
      {children}
    </AppShell>
  );
}
