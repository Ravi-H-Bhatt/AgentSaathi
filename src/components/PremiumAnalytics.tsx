"use client";

import { useMemo, useState } from "react";
import { TrendingUp, IndianRupee, CalendarClock } from "lucide-react";

interface PolicyLite {
  premium: number | null;
  sum_insured: number | null;
  renewal_date: string | null;
  mode: string | null;
}

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function inr(n: number): string {
  if (n >= 10000000) return "₹" + (n / 10000000).toFixed(2) + " Cr";
  if (n >= 100000) return "₹" + (n / 100000).toFixed(2) + " L";
  if (n >= 1000) return "₹" + (n / 1000).toFixed(1) + "k";
  return "₹" + n.toLocaleString("en-IN");
}

/**
 * Premium-to-collect analytics. Groups policies by their renewal month to show
 * how much premium is due across the year, plus headline totals.
 */
export function PremiumAnalytics({ policies }: { policies: PolicyLite[] }) {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const [view, setView] = useState<"premium" | "count">("premium");

  const { monthly, totalDue, totalSI, busiestPremMonth, busiestCountMonth } = useMemo(() => {
    const prem = new Array(12).fill(0);
    const count = new Array(12).fill(0);
    let totalDue = 0;
    let totalSI = 0;

    // Guard against corrupt parse artifacts already saved in the DB.
    // A single policy premium above ₹1 crore is not realistic for this book,
    // so treat it as bad data and exclude it from all charts/totals.
    const MAX_REALISTIC_PREMIUM = 10000000; // ₹1 Cr

    for (const p of policies) {
      // Total sum insured = full book value (all policies).
      totalSI += p.sum_insured || 0;

      const premium =
        p.premium && p.premium <= MAX_REALISTIC_PREMIUM ? p.premium : 0;

      if (!p.renewal_date) continue;
      const d = new Date(p.renewal_date);
      if (isNaN(d.getTime())) continue;

      // Map renewal to upcoming 12-month period starting from current month
      // For recurring annual renewals, we want to show the NEXT occurrence
      const renewalMonth = d.getMonth();
      const renewalYear = d.getFullYear();
      
      // Calculate the next occurrence of this renewal date
      let nextRenewal = new Date(d);
      
      // If renewal is in a past year, move it to current year
      if (renewalYear < currentYear) {
        nextRenewal.setFullYear(currentYear);
      }
      
      // If that date has already passed this year, move to next year
      if (nextRenewal < now) {
        nextRenewal.setFullYear(currentYear + 1);
      }
      
      // Now check if this renewal falls within our 12-month display window
      const displayYear = nextRenewal.getFullYear();
      
      // Only show renewals in current year OR next year (for recurring annual policies)
      if (displayYear === currentYear || displayYear === currentYear + 1) {
        const m = nextRenewal.getMonth();
        prem[m] += premium;
        count[m] += 1;
        
        // Only add to totalDue if it's actually due in current year
        if (displayYear === currentYear) {
          totalDue += premium;
        }
      }
    }

    const monthly = MONTHS.map((label, i) => ({
      label,
      premium: prem[i],
      count: count[i],
    }));
    const maxPrem = Math.max(...prem);
    const maxCount = Math.max(...count);
    return {
      monthly,
      totalDue,
      totalSI,
      busiestPremMonth: maxPrem > 0 ? MONTHS[prem.indexOf(maxPrem)] : "—",
      busiestCountMonth: maxCount > 0 ? MONTHS[count.indexOf(maxCount)] : "—",
    };
  }, [policies, currentYear, currentMonth, now]);

  const busiestMonth = view === "premium" ? busiestPremMonth : busiestCountMonth;
  const values = monthly.map((m) => (view === "premium" ? m.premium : m.count));
  const max = Math.max(...values, 1);

  // SVG line chart geometry
  const W = 760;
  const H = 220;
  const padL = 48;
  const padR = 16;
  const padT = 16;
  const padB = 28;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;
  const stepX = plotW / 11;
  const points = values.map((v, i) => ({
    x: padL + i * stepX,
    y: padT + plotH - (v / max) * plotH,
    v,
  }));
  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
  const areaPath =
    `M ${points[0].x.toFixed(1)} ${(padT + plotH).toFixed(1)} ` +
    points.map((p) => `L ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ") +
    ` L ${points[points.length - 1].x.toFixed(1)} ${(padT + plotH).toFixed(1)} Z`;
  const gridLines = [0, 0.25, 0.5, 0.75, 1];

  return (
    <section className="rounded-2xl border border-border bg-card overflow-hidden">
      <div className="px-5 py-4 border-b border-border flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <TrendingUp size={18} />
          <h2 className="font-semibold">Premium analytics</h2>
        </div>
        <div className="flex gap-1 rounded-lg bg-black/[.04] p-1">
          <button
            onClick={() => setView("premium")}
            className={`text-xs font-medium px-3 py-1.5 rounded-md transition ${
              view === "premium" ? "bg-foreground text-background" : "text-muted hover:text-foreground"
            }`}
          >
            Premium
          </button>
          <button
            onClick={() => setView("count")}
            className={`text-xs font-medium px-3 py-1.5 rounded-md transition ${
              view === "count" ? "bg-foreground text-background" : "text-muted hover:text-foreground"
            }`}
          >
            Policies
          </button>
        </div>
      </div>

      {/* Headline stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-border border-b border-border">
        <Stat icon={<IndianRupee size={15} />} label={`Premium due in ${currentYear}`} value={inr(totalDue)} />
        <Stat icon={<TrendingUp size={15} />} label="Total sum insured" value={inr(totalSI)} />
        <Stat icon={<CalendarClock size={15} />} label="Busiest renewal month" value={busiestMonth} />
      </div>

      {/* Line chart */}
      <div className="p-5">
        <p className="text-xs text-muted mb-3">
          {view === "premium" ? "Premium due" : "Policies renewing"} by month · Next 12 months
        </p>
        <div className="w-full overflow-x-auto">
          <svg
            viewBox={`0 0 ${W} ${H}`}
            className="w-full min-w-[640px]"
            style={{ height: 240 }}
          >
            <defs>
              <linearGradient id="premArea" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
              </linearGradient>
            </defs>

            {/* Grid + Y labels */}
            {gridLines.map((g, i) => {
              const y = padT + plotH - g * plotH;
              const val = max * g;
              return (
                <g key={i}>
                  <line
                    x1={padL}
                    y1={y}
                    x2={W - padR}
                    y2={y}
                    stroke="currentColor"
                    strokeOpacity="0.08"
                  />
                  <text x={padL - 8} y={y + 3} textAnchor="end" fontSize="9" fill="currentColor" fillOpacity="0.5">
                    {view === "premium" ? inr(val) : Math.round(val)}
                  </text>
                </g>
              );
            })}

            {/* Area + line */}
            <path d={areaPath} fill="url(#premArea)" />
            <path
              d={linePath}
              fill="none"
              stroke="#3b82f6"
              strokeWidth="2.5"
              strokeLinejoin="round"
              strokeLinecap="round"
            />

            {/* Points + X labels */}
            {points.map((p, i) => (
              <g key={i} className="group">
                <circle cx={p.x} cy={p.y} r="3.5" fill="#3b82f6" />
                <circle cx={p.x} cy={p.y} r="9" fill="#3b82f6" fillOpacity="0" className="hover:fill-opacity-10" />
                {p.v > 0 && (
                  <text x={p.x} y={p.y - 10} textAnchor="middle" fontSize="9" fill="#3b82f6" className="opacity-0 group-hover:opacity-100">
                    {view === "premium" ? inr(p.v) : p.v}
                  </text>
                )}
                <text x={p.x} y={H - 8} textAnchor="middle" fontSize="9" fill="currentColor" fillOpacity="0.55">
                  {monthly[i].label}
                </text>
              </g>
            ))}
          </svg>
        </div>
      </div>
    </section>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="px-5 py-4">
      <div className="flex items-center gap-1.5 text-muted text-xs mb-1">
        {icon} {label}
      </div>
      <p className="text-lg font-bold tabular-nums">{value}</p>
    </div>
  );
}
