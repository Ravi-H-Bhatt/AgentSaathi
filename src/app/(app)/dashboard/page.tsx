import { getCurrentAgent } from "@/lib/auth";
import { getClients, getPolicies } from "@/lib/data";
import { ownerIdFor, isColleague } from "@/lib/team";
import { money, daysUntil } from "@/lib/format";
import { StatCard } from "@/components/StatCard";
import { Reveal } from "@/components/Reveal";
import { RenewalsList } from "@/components/RenewalsList";
import { PremiumAnalytics } from "@/components/PremiumAnalytics";
import type { Client, Policy } from "@/lib/types";

// Always render fresh so renewal day-counts and totals are never stale.
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function DashboardPage() {
  const agent = (await getCurrentAgent())!;
  const ownerId = ownerIdFor(agent);
  // Colleagues can look up individual clients/policies, but must NOT see
  // aggregate financials (total sum insured, premium analytics).
  const colleague = isColleague(agent);
  const [clients, policies] = await Promise.all([
    getClients(ownerId),
    getPolicies(ownerId),
  ]);

  const clientById = new Map(clients.map((c) => [c.id, c]));

  // Renewals list uses the CANONICAL recurring-renewal logic (daysUntil):
  //   - annual recurrence: same dd/mm rolls to next year once >7 days past
  //   - a date that passed up to 7 days ago shows as OVERDUE (still in the list)
  //   - include anything from OVERDUE(-7) up to 30 days ahead
  //   - sort by urgency: most overdue first, then soonest upcoming
  const renewalsThisMonth = policies
    .map((p) => ({ p, d: daysUntil(p.renewal_date) }))
    .filter(({ d }) => d != null && d >= -7 && d <= 30)
    .sort((a, b) => (a.d as number) - (b.d as number))
    .map(({ p }) => p);
  const totalSI = policies.reduce((s, p) => s + (p.sum_insured || 0), 0);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted mt-1">
          Welcome back. Here&apos;s what needs your attention.
        </p>
      </div>
      <div className={`grid gap-4 sm:grid-cols-2 ${colleague ? "lg:grid-cols-3" : "lg:grid-cols-4"}`}>
        <Reveal>
          <StatCard label="Total clients" value={clients.length.toString()} />
        </Reveal>
        <Reveal delay={0.05}>
          <StatCard label="Total policies" value={policies.length.toString()} />
        </Reveal>
        <Reveal delay={0.1}>
          <StatCard
            label="Renewals in next 30 days"
            value={renewalsThisMonth.length.toString()}
            highlight
          />
        </Reveal>
        {!colleague && (
          <Reveal delay={0.15}>
            <StatCard label="Total sum insured" value={money(totalSI)} />
          </Reveal>
        )}
      </div>

      {!colleague && (
        <Reveal delay={0.08}>
          <PremiumAnalytics
            policies={policies.map((p) => ({
              premium: p.premium,
              sum_insured: p.sum_insured,
              renewal_date: p.renewal_date,
              mode: p.mode,
            }))}
          />
        </Reveal>
      )}

      <Reveal delay={0.1}>
        <section className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <h2 className="font-semibold">Renewals in next 30 days</h2>
            <span className="text-sm text-muted">
              {renewalsThisMonth.length} due
            </span>
          </div>
          {renewalsThisMonth.length === 0 ? (
            <p className="px-5 py-10 text-center text-muted text-sm">
              No renewals in the next 30 days. You&apos;re all caught up.
            </p>
          ) : (
            <RenewalsList
                agentName={agent.full_name || agent.email}
                renewals={renewalsThisMonth.map((p: Policy) => {
                const c = clientById.get(p.client_id) as Client | undefined;
                return {
                  id: p.id,
                  clientId: p.client_id,
                  clientName: c?.full_name || "Unknown client",
                  clientEmail: c?.email || null,
                  policyType: p.policy_type,
                  company: p.company,
                  policyNumber: p.policy_number,
                  sumInsured: p.sum_insured,
                  premium: p.premium,
                  renewalDate: p.renewal_date,
                  mode: p.mode,
                };
              })} />
          )}
        </section>
      </Reveal>
    </div>
  );
}
