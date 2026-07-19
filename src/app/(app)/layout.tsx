import { redirect } from "next/navigation";
import { getCurrentAgent } from "@/lib/auth";
import { getOpenTimeEntry } from "@/lib/data";
import { getMaintenance } from "@/lib/settings";
import { permissionsFor, isColleague } from "@/lib/team";
import { getWorkspace } from "@/lib/workspace";
import { AppShell } from "@/components/AppShell";

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

  // Global "work in progress" mode — the overlay is rendered LIVE inside
  // AppShell by <MaintenanceWatcher/> (polls every 2s), so it appears and
  // disappears for all agents without any manual refresh. We pass the initial
  // state from the server to avoid a flash on cold load (installed PWA).
  let maintenance = { active: false, message: null as string | null };
  try {
    maintenance = await getMaintenance();
  } catch {
    /* settings table may not exist yet */
  }

  const openEntry = await getOpenTimeEntry(agent.id);
  const workspace = await getWorkspace();

  return (
    <AppShell
      agentName={agent.full_name || agent.email}
      agentEmail={agent.email}
      agentPhone={agent.phone}
      agentId={agent.id}
      isColleague={isColleague(agent)}
      permissions={permissionsFor(agent)}
      openSince={openEntry?.clock_in ?? null}
      workspace={workspace}
      maintenanceActive={maintenance.active}
      maintenanceMessage={maintenance.message}
    >
      {children}
    </AppShell>
  );
}
