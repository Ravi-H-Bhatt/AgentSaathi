import Link from "next/link";
import { getCurrentAgent } from "@/lib/auth";
import { getClients, getPolicies } from "@/lib/data";
import { ownerIdFor } from "@/lib/team";
import { money, shortDate, isThisMonth, daysUntil } from "@/lib/format";
import { StatCard } from "@/components/StatCard";
import { Reveal } from "@/components/Reveal";
import type { Client, Policy } from "@/lib/types";

export default async function DashboardPage() {
  const agent = (await getCurrentAgent())!;
  const ownerId = ownerIdFor(agent);
  const [clients, policies] = await Promise.all([
    getClients(ownerId),
    getPolicies(ownerId),
  ]);

  const clientById = new Map(clients.map((c) => [c.id, c]));
  const renewalsThisMonth = policies
    .filter((p) => isThisMonth(p.renewal_date))
    .sort(
      (a, b) =>
        new Date(a.renewal_date!).getTime() -
        new Date(b.renewal_date!).getTime()
    );
  const totalSI = policies.reduce((s, p) => s + (p.sum_insured || 0), 0);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted mt-1">
          Welcome back. Here&apos;s what needs your attention.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Reveal>
          <StatCard label="Total clients" value={clients.length.toString()} />
        </Reveal>
        <Reveal delay={0.05}>
          <StatCard label="Total policies" value={policies.length.toString()} />
        </Reveal>
        <Reveal delay={0.1}>
          <StatCard
            label="Renewals this month"
            value={renewalsThisMonth.length.toString()}
            highlight
          />
        </Reveal>
        <Reveal delay={0.15}>
          <StatCard label="Total sum insured" value={money(totalSI)} />
        </Reveal>
      </div>

      <Reveal delay={0.1}>
        <section className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <h2 className="font-semibold">Renewals this month</h2>
            <span className="text-sm text-muted">
              {renewalsThisMonth.length} due
            </span>
          </div>
          {renewalsThisMonth.length === 0 ? (
            <p className="px-5 py-10 text-center text-muted text-sm">
              No renewals this month. You&apos;re all caught up.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {renewalsThisMonth.map((p: Policy) => {
                const c = clientById.get(p.client_id) as Client | undefined;
                const dleft = daysUntil(p.renewal_date);
                return (
                  <li key={p.id}>
                    <Link
                      href={`/clients/${p.client_id}`}
                      className="flex items-center justify-between px-5 py-4 hover:bg-black/[.02] hover:pl-6 transition-all duration-200"
                    >
                      <div className="min-w-0">
                        <p className="font-medium truncate">
                          {c?.full_name || "Unknown client"}
                        </p>
                        <p className="text-sm text-muted truncate">
                          {p.policy_type || "Policy"}
                          {p.company ? ` · ${p.company}` : ""} ·{" "}
                          {p.policy_number || "—"}
                        </p>
                      </div>
                      <div className="text-right shrink-0 ml-4">
                        <p className="text-sm font-medium">
                          {shortDate(p.renewal_date)}
                        </p>
                        <p
                          className={`text-xs ${
                            dleft != null && dleft <= 7
                              ? "text-red-600"
                              : "text-muted"
                          }`}
                        >
                          {dleft != null
                            ? dleft < 0
                              ? `${Math.abs(dleft)}d overdue`
                              : `in ${dleft}d`
                            : ""}
                        </p>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </Reveal>
    </div>
  );
}
