import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getCurrentAgent } from "@/lib/auth";
import { getClientWithPolicies, getPremiumCharts } from "@/lib/data";
import { ownerIdFor, permissionsFor, logActivity } from "@/lib/team";
import { getWorkspace } from "@/lib/workspace";
import { projectPremiumChanges } from "@/lib/premium";
import { ClientDetail } from "@/components/ClientDetail";

export default async function ClientPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const agent = (await getCurrentAgent())!;
  if (!permissionsFor(agent).clients) redirect("/dashboard");
  const ownerId = ownerIdFor(agent);
  const workspace = await getWorkspace();
  const client = await getClientWithPolicies(ownerId, id, workspace);
  if (!client) notFound();

  // Log that this user viewed the client (for the colleagues activity feed).
  await logActivity(agent, "view_client", client.full_name);

  const charts = await getPremiumCharts();
  const projections = projectPremiumChanges(client, client.policies, charts);

  // For colleagues, use the owning agent's phone in intimation emails (so the
  // agency number shows in the signature, not the colleague's).
  let agentPhone = agent.phone;
  if (agent.parent_agent_id) {
    const { createClient } = await import("@/lib/supabase/server");
    const db = await createClient();
    const { data: owner } = await db
      .from("agents")
      .select("phone")
      .eq("id", agent.parent_agent_id)
      .single();
    if (owner?.phone) agentPhone = owner.phone;
  }

  return (
    <div className="space-y-6">
      <Link
        href="/clients"
        className="inline-flex items-center gap-2 text-sm text-muted hover:text-foreground transition"
      >
        <ArrowLeft size={16} /> All clients
      </Link>
      <ClientDetail
        client={client}
        agentName={agent.full_name || agent.email}
        agentEmail={agent.email}
        agentPhone={agentPhone}
        projections={projections}
        canDelete={permissionsFor(agent).delete}
      />
    </div>
  );
}
