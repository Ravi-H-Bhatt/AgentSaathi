import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getCurrentAgent } from "@/lib/auth";
import { getClientWithPolicies, getPremiumCharts } from "@/lib/data";
import { ownerIdFor, permissionsFor, logActivity } from "@/lib/team";
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
  const client = await getClientWithPolicies(ownerId, id);
  if (!client) notFound();

  // Log that this user viewed the client (for the colleagues activity feed).
  await logActivity(agent, "view_client", client.full_name);

  const charts = await getPremiumCharts();
  const projections = projectPremiumChanges(client, client.policies, charts);

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
        projections={projections}
        canDelete={!agent.parent_agent_id}
      />
    </div>
  );
}
