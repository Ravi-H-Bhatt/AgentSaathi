import { redirect } from "next/navigation";
import { getCurrentAgent } from "@/lib/auth";
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

  return (
    <AppShell
      agentName={agent.full_name || agent.email}
      agentEmail={agent.email}
      avatarUrl={agent.avatar_url}
    >
      {children}
    </AppShell>
  );
}
