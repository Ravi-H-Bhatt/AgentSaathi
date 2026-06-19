import { redirect } from "next/navigation";
import { getCurrentAgent } from "@/lib/auth";
import {
  getColleagues,
  getInvitations,
  getTeamTimeEntries,
  getTeamActivity,
} from "@/lib/data";
import { ColleaguesManager } from "@/components/ColleaguesManager";

// Team data depends on the session — never prerender.
export const dynamic = "force-dynamic";

export default async function ColleaguesPage() {
  const agent = (await getCurrentAgent())!;

  // Colleagues cannot manage other colleagues.
  if (agent.parent_agent_id) redirect("/dashboard");

  const [colleagues, invitations, timeEntries, activity] = await Promise.all([
    getColleagues(agent.id),
    getInvitations(agent.id),
    getTeamTimeEntries(agent.id),
    getTeamActivity(agent.id),
  ]);

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    "http://localhost:3000";

  return (
    <ColleaguesManager
      siteUrl={siteUrl}
      colleagues={colleagues.map((c) => ({
        id: c.id,
        name: c.full_name,
        email: c.email,
        permissions: c.permissions,
        joined: c.created_at,
      }))}
      invitations={invitations.map((i) => ({
        id: i.id,
        token: i.token,
        email: i.email,
        status: i.status,
        permissions: i.permissions,
        createdAt: i.created_at,
      }))}
      timeEntries={timeEntries.map((t) => ({
        id: t.id,
        agentId: t.agent_id,
        clockIn: t.clock_in,
        clockOut: t.clock_out,
      }))}
      activity={activity.map((a) => ({
        id: a.id,
        agentId: a.agent_id,
        action: a.action,
        detail: a.detail,
        createdAt: a.created_at,
      }))}
    />
  );
}
