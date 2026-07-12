import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentAgent } from "@/lib/auth";
import { getAllClientsWithPolicies } from "@/lib/data";
import { ownerIdFor, permissionsFor, isColleague } from "@/lib/team";
import { ClientsList } from "@/components/ClientsList";
import { DownloadAllButton } from "@/components/DownloadAllButton";
import { MonthlyRenewalDownload } from "@/components/MonthlyRenewalDownload";
import { DeleteAllClientsButton } from "@/components/DeleteAllClientsButton";

export default async function ClientsPage() {
  const agent = (await getCurrentAgent())!;
  if (!permissionsFor(agent).clients) redirect("/dashboard");
  const clientsWithPolicies = await getAllClientsWithPolicies(ownerIdFor(agent));

  const data = clientsWithPolicies.map((c) => {
    // Get most recent address from policies (first policy has most recent renewal_date due to ordering)
    const mostRecentAddress = c.policies.find(p => p.client_address)?.client_address || null;
    
    // Everything a client's policies can be searched by (type, product, insurer).
    const policyMeta = Array.from(
      new Set(
        c.policies
          .flatMap((p) => [p.policy_type, p.product_name, p.company])
          .filter((v): v is string => !!v)
      )
    );

    return {
      id: c.id,
      full_name: c.full_name,
      email: c.email,
      phone: c.phone,
      address: mostRecentAddress,
      policyCount: c.policies.length,
      policyNumbers: c.policies
        .map((p) => p.policy_number)
        .filter((n): n is string => !!n),
      policyMeta,
    };
  });

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Clients</h1>
          <p className="text-muted mt-1">{clientsWithPolicies.length} total</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <MonthlyRenewalDownload
            clients={clientsWithPolicies}
            agentName={agent.full_name || agent.email}
          />
          <DownloadAllButton
            clients={clientsWithPolicies}
            agentName={agent.full_name || agent.email}
          />
          {!isColleague(agent) && clientsWithPolicies.length > 0 && (
            <DeleteAllClientsButton />
          )}
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
