import Link from "next/link";
import { getCurrentAgent } from "@/lib/auth";
import { getClients, getPolicies } from "@/lib/data";
import { ClientsList } from "@/components/ClientsList";

export default async function ClientsPage() {
  const agent = (await getCurrentAgent())!;
  const [clients, policies] = await Promise.all([
    getClients(agent.id),
    getPolicies(agent.id),
  ]);

  const counts: Record<string, number> = {};
  const numbers: Record<string, string[]> = {};
  for (const p of policies) {
    counts[p.client_id] = (counts[p.client_id] || 0) + 1;
    if (p.policy_number) {
      (numbers[p.client_id] ||= []).push(p.policy_number);
    }
  }

  const data = clients.map((c) => ({
    id: c.id,
    full_name: c.full_name,
    email: c.email,
    phone: c.phone,
    policyCount: counts[c.id] || 0,
    policyNumbers: numbers[c.id] || [],
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Clients</h1>
          <p className="text-muted mt-1">{clients.length} total</p>
        </div>
        <Link
          href="/upload"
          className="text-sm font-medium px-4 py-2 rounded-full bg-foreground text-background hover:opacity-90 transition"
        >
          + Add policy
        </Link>
      </div>
      <ClientsList clients={data} />
    </div>
  );
}
