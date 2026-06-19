import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getCurrentAgent } from "@/lib/auth";
import { getClientWithPolicies, getPremiumCharts } from "@/lib/data";
import { projectPremiumChanges } from "@/lib/premium";
import { ClientDetail } from "@/components/ClientDetail";

export default async function ClientPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const agent = (await getCurrentAgent())!;
  const client = await getClientWithPolicies(agent.id, id);
  if (!client) notFound();

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
        projections={projections}
      />
    </div>
  );
}
