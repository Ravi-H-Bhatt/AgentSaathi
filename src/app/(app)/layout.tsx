import { redirect } from "next/navigation";
import { getCurrentAgent } from "@/lib/auth";
import { getOpenTimeEntry } from "@/lib/data";
import { permissionsFor, isColleague } from "@/lib/team";
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
