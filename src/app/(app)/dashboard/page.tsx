import { getCurrentAgent } from "@/lib/auth";
import { getClients, getPolicies } from "@/lib/data";
import { ownerIdFor, isColleague } from "@/lib/team";
import { money, isThisMonth } from "@/lib/format";
import { StatCard } from "@/components/StatCard";
import { Reveal } from "@/components/Reveal";
import { RenewalsList } from "@/components/RenewalsList";
import { PremiumAnalytics } from "@/components/PremiumAnalytics";
import type { Client, Policy } from "@/lib/types";

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
  
  // Get renewals in next 30 days, EXCLUDING overdue policies older than 5 days
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const fiveDaysAgo = new Date(today);
  fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
  const thirtyDaysFromNow = new Date(today);
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
  
  const renewalsThisMonth = policies
    .filter((p) => {
      if (!p.renewal_date) return false;
      const renewalDate = new Date(p.renewal_date);
      renewalDate.setHours(0, 0, 0, 0);
      
      // Exclude if overdue by more than 5 days
      if (renewalDate < fiveDaysAgo) return false;
      
      // Include if within next 30 days
      return renewalDate <= thirtyDaysFromNow;
    })
    .sort((a, b) => {
      // Sort by urgency: overdue first (most overdue = highest priority), then upcoming
      const dateA = new Date(a.renewal_date!);
      const dateB = new Date(b.renewal_date!);
      dateA.setHours(0, 0, 0, 0);
      dateB.setHours(0, 0, 0, 0);
      
      const daysUntilA = Math.floor((dateA.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      const daysUntilB = Math.floor((dateB.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      // Overdue policies (negative days) sorted by most overdue first
      // Then upcoming policies sorted by soonest first
      return daysUntilA - daysUntilB;
    });
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
