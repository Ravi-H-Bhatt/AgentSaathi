"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Download, Mail, TrendingUp, Phone, AtSign, FileText, Eye, Trash2, Loader2 } from "lucide-react";
import { money, shortDate } from "@/lib/format";
import type { ClientWithPolicies, Policy } from "@/lib/types";
import type { PremiumProjection } from "@/lib/premium";
import { downloadClientPdf } from "@/lib/clientPdf";

export function ClientDetail({
  client,
  agentName,
  projections,
  canDelete = false,
}: {
  client: ClientWithPolicies;
  agentName: string;
  projections: PremiumProjection[];
  canDelete?: boolean;
}) {
  const router = useRouter();
  const [sending, setSending] = useState<string | null>(null);
  const [opening, setOpening] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [notice, setNotice] = useState<{ type: "ok" | "err"; msg: string } | null>(
    null
  );

  const projByPolicy = new Map(projections.map((p) => [p.policyId, p]));

  /** Open or download the stored PDF via a short-lived signed URL. */
  async function openFile(policyId: string, download: boolean) {
    setOpening(policyId + (download ? "-dl" : "-view"));
    setNotice(null);
    try {
      const res = await fetch(
        `/api/policies/file?policyId=${policyId}${download ? "&download=1" : ""}`
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not open document");
      window.open(data.url, "_blank", "noopener,noreferrer");
    } catch (e) {
      setNotice({
        type: "err",
        msg: e instanceof Error ? e.message : "Could not open document.",
      });
    } finally {
      setOpening(null);
    }
  }

  async function deleteClient() {
    if (
      !confirm(
        `Delete ${client.full_name} and all their policies? This cannot be undone.`
      )
    )
      return;
    setDeleting(true);
    setNotice(null);
    try {
      const res = await fetch(`/api/clients?id=${client.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Delete failed");
      router.push("/clients");
      router.refresh();
    } catch (e) {
      setNotice({
        type: "err",
        msg: e instanceof Error ? e.message : "Delete failed.",
      });
      setDeleting(false);
    }
  }

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
      <div className="rounded-2xl border border-border bg-card p-4 sm:p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-2xl bg-foreground text-background flex items-center justify-center text-lg sm:text-xl font-bold shrink-0">
              {client.full_name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight truncate">
                {client.full_name}
              </h1>
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-sm text-muted">
                {client.email && (
                  <span className="inline-flex items-center gap-1 min-w-0">
                    <AtSign size={14} className="shrink-0" />{" "}
                    <span className="break-all">{client.email}</span>
                  </span>
                )}
                {client.phone && (
                  <span className="inline-flex items-center gap-1">
                    <Phone size={14} className="shrink-0" /> {client.phone}
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
          {canDelete && (
            <button
              onClick={deleteClient}
              disabled={deleting}
              className="inline-flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-full border border-red-200 text-red-600 hover:bg-red-50 transition disabled:opacity-50"
            >
              {deleting ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Trash2 size={16} />
              )}
              Delete client
            </button>
          )}
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
                        {p.product_name || p.policy_type || "Policy"}
                        {proj && (
                          <span className="ml-2 inline-block text-xs font-medium text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                            premium change soon
                          </span>
                        )}
                      </p>
                      <p className="text-sm text-muted">
                        {p.company || "—"} · Policy #{p.policy_number || "No number"}
                        {p.policy_type && p.product_name && p.product_name !== p.policy_type && (
                          <span className="ml-2">· {p.policy_type}</span>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {p.source_file_path && (
                        <>
                          <button
                            onClick={() => openFile(p.id, false)}
                            disabled={opening === p.id + "-view"}
                            className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border border-border hover:bg-black/[.03] transition disabled:opacity-50"
                            title="View policy document"
                          >
                            {opening === p.id + "-view" ? (
                              <Loader2 size={14} className="animate-spin" />
                            ) : (
                              <Eye size={14} />
                            )}
                            View
                          </button>
                          <button
                            onClick={() => openFile(p.id, true)}
                            disabled={opening === p.id + "-dl"}
                            className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border border-border hover:bg-black/[.03] transition disabled:opacity-50"
                            title="Download policy document"
                          >
                            {opening === p.id + "-dl" ? (
                              <Loader2 size={14} className="animate-spin" />
                            ) : (
                              <FileText size={14} />
                            )}
                            Download
                          </button>
                        </>
                      )}
                      {client.email && (
                        <button
                          onClick={() => sendReminder(p.id)}
                          disabled={sending === p.id}
                          className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full bg-foreground text-background hover:opacity-90 transition disabled:opacity-50"
                        >
                          <Mail size={14} />
                          {sending === p.id ? "Sending…" : "Remind"}
                        </button>
                      )}
                    </div>
                  </div>
                  <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4 text-sm">
                    <Field label="Sum insured" value={money(p.sum_insured)} />
                    <Field
                      label="Premium"
                      value={
                        money(p.premium) + (p.mode ? ` (${p.mode})` : "")
                      }
                    />
                    <Field label="Start" value={shortDate(p.start_date)} />
                    <Field label="Renewal" value={shortDate(p.renewal_date)} />
                  </dl>
                  {p.client_address && (
                    <div className="mt-3 pt-3 border-t border-border">
                      <dt className="text-muted text-xs">Address</dt>
                      <dd className="font-medium mt-1 text-sm">{p.client_address}</dd>
                    </div>
                  )}
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
