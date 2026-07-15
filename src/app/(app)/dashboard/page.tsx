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

  // "Renewals needing attention": OVERDUE by up to 5 days (recent, for
  // follow-up) plus everything renewing in the next 30 days. Uses recurring
  // dd/mm logic, so a policy stored with a future year still surfaces when its
  // day-and-month falls within the window. Sorted most-overdue first.
  // Policies marked "renewed" recently (this cycle) are hidden.
  const nowMs = Date.now();
  const RENEWED_HIDE_MS = 330 * 24 * 60 * 60 * 1000; // hide for ~this cycle
  const renewalsThisMonth = policies
    .filter((p) => {
      // Hide if marked renewed within the current cycle (~330 days).
      // The marker lives in raw_extract.renewed_at (no schema change needed).
      const renewedAt = (p.raw_extract as { renewed_at?: string } | null)?.renewed_at;
      if (renewedAt) {
        const t = new Date(renewedAt).getTime();
        if (!isNaN(t) && nowMs - t < RENEWED_HIDE_MS) return false;
      }
      return true;
    })
    .map((p) => ({ p, d: daysUntil(p.renewal_date) }))
    .filter(({ d }) => d != null && d >= -5 && d <= 30)
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
                  clientPhone: c?.phone || null,
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
