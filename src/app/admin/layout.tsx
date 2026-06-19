import { redirect } from "next/navigation";
import { getCurrentAgent } from "@/lib/auth";
import { AdminShell } from "@/components/AdminShell";

// Admin area depends on the request session — never prerender.
export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const agent = await getCurrentAgent();
  if (!agent) redirect("/login");
  if (agent.role !== "admin") redirect("/dashboard");

  return (
    <AdminShell agentEmail={agent.email}>
      {children}
    </AdminShell>
  );
}
