import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentAgent } from "@/lib/auth";
import { getAllClientsWithPolicies } from "@/lib/data";
import { ownerIdFor, permissionsFor } from "@/lib/team";
import { ClientsList } from "@/components/ClientsList";
import { DownloadAllButton } from "@/components/DownloadAllButton";

export default async function ClientsPage() {
  const agent = (await getCurrentAgent())!;
  if (!permissionsFor(agent).clients) redirect("/dashboard");
  const clientsWithPolicies = await getAllClientsWithPolicies(ownerIdFor(agent));

  const data = clientsWithPolicies.map((c) => ({
    id: c.id,
    full_name: c.full_name,
    email: c.email,
    phone: c.phone,
    policyCount: c.policies.length,
    policyNumbers: c.policies
      .map((p) => p.policy_number)
      .filter((n): n is string => !!n),
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Clients</h1>
          <p className="text-muted mt-1">{clientsWithPolicies.length} total</p>
        </div>
        <div className="flex items-center gap-2">
          <DownloadAllButton
            clients={clientsWithPolicies}
            agentName={agent.full_name || agent.email}
          />
          <Link
            href="/upload"
            className="text-sm font-medium px-4 py-2 rounded-full bg-foreground text-background hover:opacity-90 transition"
          >
            + Add policy
          </Link>
        </div>
      </div>
      <ClientsList clients={data} />
    </div>
  );
}
