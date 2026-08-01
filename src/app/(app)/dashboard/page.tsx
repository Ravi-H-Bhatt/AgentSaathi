import { getCurrentAgent } from "@/lib/auth";
import { getClients, getPolicies } from "@/lib/data";
import { ownerIdFor, isColleague } from "@/lib/team";
import { getWorkspace } from "@/lib/workspace";
import { money, daysUntil } from "@/lib/format";
import { licDaysUntil, getLicNextDueISO } from "@/lib/lic-renewal";
import { StatCard } from "@/components/StatCard";
import { Reveal } from "@/components/Reveal";
import { RenewalsList } from "@/components/RenewalsList";
import { PremiumAnalytics } from "@/components/PremiumAnalytics";
import { PolicySearch } from "@/components/PolicySearch";
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
  const workspace = await getWorkspace();
  const isLic = workspace === "lic";
  const [clients, policies] = await Promise.all([
    getClients(ownerId, workspace),
    getPolicies(ownerId, workspace),
  ]);

  // Renewal day-count is mode-aware in the LIC workspace (counted from the
  // D.o.C day + Mode: Monthly/Quarterly/Half-Yearly/Yearly), and the classic
  // annual dd/mm logic on the Home side.
  const licPaidThrough = (p: Policy): string | null =>
    (p.raw_extract as { paid_through?: string } | null)?.paid_through ?? null;
  const dueInDays = (p: Policy): number | null =>
    isLic
      ? licDaysUntil(p.start_date, p.mode, undefined, licPaidThrough(p))
      : daysUntil(p.renewal_date);

  const clientById = new Map(clients.map((c) => [c.id, c]));

  // Renewal day-count is mode-aware in the LIC workspace (counted from the
  // D.o.C day + Mode: Monthly/Quarterly/Half-Yearly/Yearly), and the classic
  // annual dd/mm logic on the Home side.
  const nowMs = Date.now();
  const RENEWED_HIDE_MS = 330 * 24 * 60 * 60 * 1000; // hide for ~this cycle
  
  // Split policies into renewals (next 30 days) and overdue (past due)
  const policyWithDays = policies
    .filter((p) => {
      if (!isLic) {
        const renewedAt = (p.raw_extract as { renewed_at?: string } | null)?.renewed_at;
        if (renewedAt) {
          const t = new Date(renewedAt).getTime();
          if (!isNaN(t) && nowMs - t < RENEWED_HIDE_MS) return false;
        }
      }
      // LIC: Filter out Monthly mode (auto-renewed), show only Quarterly, Half-Yearly, Yearly
      if (isLic && p.mode && p.mode.toLowerCase() === "monthly") {
        return false;
      }
      return true;
    })
    .map((p) => ({ p, d: dueInDays(p) }));

  const renewalsThisMonth = policyWithDays
    .filter(({ d }) => d != null && d >= 0 && d <= 30)
    .sort((a, b) => (a.d as number) - (b.d as number))
    .map(({ p }) => p);

  const overdueRenewals = policyWithDays
    .filter(({ d }) => d != null && d < 0 && d >= -5)
    .sort((a, b) => (b.d as number) - (a.d as number)) // most overdue first
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
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left: Renewals in next 30 days - takes 2 columns on desktop */}
          <section className="lg:col-span-2 rounded-2xl border border-border bg-card overflow-hidden">
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
                    nextDueDate: isLic
                      ? getLicNextDueISO(p.start_date, p.mode, undefined, licPaidThrough(p))
                      : undefined,
                    daysLeft: isLic ? dueInDays(p) : undefined,
                  };
                })} />
            )}
          </section>

          {/* Right: Overdue renewals */}
          <section className="rounded-2xl border border-border bg-card overflow-hidden">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <h2 className="font-semibold">Overdue</h2>
              <span className="text-sm text-red-600 font-medium">
                {overdueRenewals.length}
              </span>
            </div>
            {overdueRenewals.length === 0 ? (
              <p className="px-5 py-10 text-center text-muted text-sm">
                No overdue renewals. Great job!
              </p>
            ) : (
              <RenewalsList
                  agentName={agent.full_name || agent.email}
                  renewals={overdueRenewals.map((p: Policy) => {
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
                    nextDueDate: isLic
                      ? getLicNextDueISO(p.start_date, p.mode, undefined, licPaidThrough(p))
                      : undefined,
                    daysLeft: isLic ? dueInDays(p) : undefined,
                  };
                })} />
            )}
          </section>
        </div>
      </Reveal>
    </div>
  );
}
