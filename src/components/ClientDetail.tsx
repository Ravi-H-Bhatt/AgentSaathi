"use client";

import { useState } from "react";
import { Download, Mail, TrendingUp, Phone, AtSign } from "lucide-react";
import { money, shortDate } from "@/lib/format";
import type { ClientWithPolicies, Policy } from "@/lib/types";
import type { PremiumProjection } from "@/lib/premium";
import { downloadClientPdf } from "@/lib/clientPdf";

export function ClientDetail({
  client,
  agentName,
  projections,
}: {
  client: ClientWithPolicies;
  agentName: string;
  projections: PremiumProjection[];
}) {
  const [sending, setSending] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ type: "ok" | "err"; msg: string } | null>(
    null
  );

  const projByPolicy = new Map(projections.map((p) => [p.policyId, p]));

  async function sendReminder(policyId: string) {
    setSending(policyId);
    setNotice(null);
    try {
      const res = await fetch("/api/send-renewal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ policyId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setNotice({ type: "ok", msg: "Reminder email sent." });
    } catch (e) {
      setNotice({
        type: "err",
        msg: e instanceof Error ? e.message : "Failed to send.",
      });
    } finally {
      setSending(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header card */}
      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-foreground text-background flex items-center justify-center text-xl font-bold">
              {client.full_name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                {client.full_name}
              </h1>
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-sm text-muted">
                {client.email && (
                  <span className="inline-flex items-center gap-1">
                    <AtSign size={14} /> {client.email}
                  </span>
                )}
                {client.phone && (
                  <span className="inline-flex items-center gap-1">
                    <Phone size={14} /> {client.phone}
                  </span>
                )}
                {client.age != null && <span>Age {client.age}</span>}
              </div>
            </div>
          </div>
          <button
            onClick={() => downloadClientPdf(client, agentName)}
            className="inline-flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-full border border-border hover:bg-black/[.03] transition"
          >
            <Download size={16} /> Download report
          </button>
        </div>
      </div>

      {notice && (
        <div
          className={`rounded-xl px-4 py-3 text-sm ${
            notice.type === "ok"
              ? "bg-green-50 text-green-700"
              : "bg-red-50 text-red-700"
          }`}
        >
          {notice.msg}
        </div>
      )}

      {/* Premium projections */}
      {projections.length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <div className="flex items-center gap-2 font-semibold text-amber-800">
            <TrendingUp size={18} /> Upcoming premium changes
          </div>
          <ul className="mt-3 space-y-2">
            {projections.map((p) => (
              <li key={p.policyId} className="text-sm text-amber-900">
                <span className="font-medium">{p.policyType || "Policy"}</span>:
                premium changes from {money(p.currentPremium)} to{" "}
                <span className="font-semibold">{money(p.projectedPremium)}</span>{" "}
                at age {p.newAge} (effective {shortDate(p.effectiveDate)}).
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Policies */}
      <div>
        <h2 className="font-semibold mb-3">
          Policies ({client.policies.length})
        </h2>
        {client.policies.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card py-12 text-center text-muted text-sm">
            No policies on record for this client.
          </div>
        ) : (
          <div className="space-y-3">
            {client.policies.map((p: Policy) => {
              const proj = projByPolicy.get(p.id);
              return (
                <div
                  key={p.id}
                  className="rounded-2xl border border-border bg-card p-5"
                >
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div>
                      <p className="font-semibold">
                        {p.policy_type || "Policy"}
                        {proj && (
                          <span className="ml-2 inline-block text-xs font-medium text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                            premium change soon
                          </span>
                        )}
                      </p>
                      <p className="text-sm text-muted">
                        {p.company || "—"} · {p.policy_number || "No number"}
                      </p>
                    </div>
                    {client.email && (
                      <button
                        onClick={() => sendReminder(p.id)}
                        disabled={sending === p.id}
                        className="inline-flex items-center gap-2 text-sm font-medium px-3.5 py-2 rounded-full bg-foreground text-background hover:opacity-90 transition disabled:opacity-50"
                      >
                        <Mail size={15} />
                        {sending === p.id ? "Sending…" : "Send reminder"}
                      </button>
                    )}
                  </div>
                  <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4 text-sm">
                    <Field label="Sum insured" value={money(p.sum_insured)} />
                    <Field label="Premium" value={money(p.premium)} />
                    <Field label="Start" value={shortDate(p.start_date)} />
                    <Field label="Renewal" value={shortDate(p.renewal_date)} />
                  </dl>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-muted text-xs">{label}</dt>
      <dd className="font-medium mt-0.5">{value}</dd>
    </div>
  );
}
