"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Download, Mail, TrendingUp, Phone, AtSign, FileText, Eye, Trash2, Loader2, Send, Check, Pencil, MessageCircle } from "lucide-react";
import { money, shortDate, companyLabel } from "@/lib/format";
import { getLicNextDueISO } from "@/lib/lic-renewal";
import type { ClientWithPolicies, Policy } from "@/lib/types";
import type { PremiumProjection } from "@/lib/premium";
import { downloadClientPdf } from "@/lib/clientPdf";

/**
 * Canonical 10-digit Indian mobile from any stored/typed value, or null if it
 * isn't a valid Indian mobile (e.g. a masked "XXXXXX3163" extracted number).
 */
function indianMobile(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let d = String(raw).replace(/\D/g, "");
  if (d.length === 12 && d.startsWith("91")) d = d.slice(2);
  if (d.length === 11 && d.startsWith("0")) d = d.slice(1);
  return /^[6-9]\d{9}$/.test(d) ? d : null;
}

/** Format an ISO date (yyyy-mm-dd) as d/m/yyyy (e.g. "9/10/2025"). */
function dmy(iso: string | null | undefined): string {
  if (!iso) return "";
  const m = String(iso).slice(0, 10).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return "";
  return `${Number(m[3])}/${Number(m[2])}/${m[1]}`;
}

/**
 * Build a Gmail compose link for a mediclaim intimation. Opens Gmail web
 * compose so the email is sent FROM the agent's own signed-in Gmail account
 * (a real personal send — avoids the spam folder). The agent fills the
 * remaining blanks (hospital, disease, amount) before sending.
 */
function buildIntimation(
  policy: Policy,
  clientName: string,
  clientPhone: string | null,
  sumInsured: number | null,
  agentName: string,
  agentPhone?: string | null
): { webUrl: string; subject: string; body: string } {
  const today = dmy(new Date().toISOString());
  const period =
    policy.start_date || policy.renewal_date
      ? `${dmy(policy.start_date)} to ${dmy(policy.renewal_date)}`
      : "";
  const si =
    sumInsured != null ? "Rs. " + Number(sumInsured).toLocaleString("en-IN") : "";

  const subject = "INTIMATION FOR MEDICLAIM";
  const body = [
    "Dear Sir,",
    "",
    `1.  Policy No: ${policy.policy_number || ""}`,
    `2.  Name of the Policy holder: ${clientName}`,
    `3.  Policy Period: ${period}`,
    `4.  Name of the hospitalized person: ${clientName}`,
    `5.  Sum Insured: ${si}`,
    `6.  Date of the admission in the hospital:  (${today})`,
    `7.  Name and Address of the hospital: `,
    `8.  Insured contact no: ${clientPhone || ""}`,
    `9.  Disease/Reason of Hospitalization: `,
    `10. Estimated Amount: `,
    "",
    "Regards,",
    agentName,
    agentPhone ? `(M) ${agentPhone}` : "(M) ",
  ].join("\n");

  const webUrl =
    "https://mail.google.com/mail/?view=cm&fs=1&tf=1&to=" +
    "&su=" +
    encodeURIComponent(subject) +
    "&body=" +
    encodeURIComponent(body);

  return { webUrl, subject, body };
}

/**
 * Open the intimation in Gmail:
 *  - Desktop / Android: open Gmail web compose in a new tab. (On Android the
 *    Gmail app registers mail.google.com links, so it may open the app.)
 *  - iOS: try the Gmail app compose scheme, falling back to Gmail web if the
 *    app isn't installed.
 * The email is composed FROM the agent's signed-in Gmail account (a real send,
 * so it won't land in spam).
 */
function openIntimation(webUrl: string, subject: string, body: string) {
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  const isIOS = /iPhone|iPad|iPod/i.test(ua);
  if (isIOS) {
    const appUrl =
      "googlegmail://co?subject=" +
      encodeURIComponent(subject) +
      "&body=" +
      encodeURIComponent(body);
    let opened = false;
    const timer = window.setTimeout(() => {
      if (!opened) window.location.href = webUrl;
    }, 900);
    const onHide = () => {
      opened = true;
      window.clearTimeout(timer);
    };
    document.addEventListener("visibilitychange", onHide, { once: true });
    window.location.href = appUrl;
    return;
  }
  window.open(webUrl, "_blank", "noopener,noreferrer");
}

export function ClientDetail({
  client,
  agentName,
  agentEmail,
  agentPhone,
  projections,
  canDelete = false,
}: {
  client: ClientWithPolicies;
  agentName: string;
  agentEmail?: string;
  agentPhone?: string | null;
  projections: PremiumProjection[];
  canDelete?: boolean;
}) {
  const router = useRouter();
  const [sending, setSending] = useState<string | null>(null);
  const [opening, setOpening] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deletingPolicy, setDeletingPolicy] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ type: "ok" | "err"; msg: string } | null>(
    null
  );

  // Inline mobile-number entry/editing.
  //  - No phone on file      → can ADD a number.
  //  - Manually-added number → can EDIT it.
  //  - Extracted number      → stays FIXED (no edit).
  const [phone, setPhone] = useState<string | null>(client.phone);
  const [phoneManual, setPhoneManual] = useState<boolean>(!!client.phone_manual);
  const [phoneInput, setPhoneInput] = useState("");
  const [editingPhone, setEditingPhone] = useState(false);
  const [savingPhone, setSavingPhone] = useState(false);

  const mobile = indianMobile(phone);

  function startEditPhone() {
    setPhoneInput(indianMobile(phone) ?? "");
    setEditingPhone(true);
  }

  async function savePhone() {
    let digits = phoneInput.replace(/\D/g, "");
    if (digits.length === 12 && digits.startsWith("91")) digits = digits.slice(2);
    if (!/^[6-9]\d{9}$/.test(digits)) {
      setNotice({
        type: "err",
        msg: "Enter a valid 10-digit Indian mobile number.",
      });
      return;
    }
    setSavingPhone(true);
    setNotice(null);
    try {
      const res = await fetch("/api/clients", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: client.id, phone: digits }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not save number");
      setPhone(data.phone ?? digits);
      setPhoneManual(true);
      setEditingPhone(false);
      setPhoneInput("");
      setNotice({ type: "ok", msg: "Mobile number saved." });
      router.refresh();
    } catch (e) {
      setNotice({
        type: "err",
        msg: e instanceof Error ? e.message : "Could not save number.",
      });
    } finally {
      setSavingPhone(false);
    }
  }

  /**
   * Jump to the email composer (/email) with this client's details pre-filled.
   * The composer reads this payload from sessionStorage on mount and fills the
   * To / CC / Subject / Body fields. CC is left blank for the agent to fill.
   */
  function emailClient() {
    if (!client.email) {
      setNotice({ type: "err", msg: "This client has no email address on file." });
      return;
    }
    try {
      sessionStorage.setItem(
        "agentsaathi_email_prefill",
        JSON.stringify({
          to: client.email,
          cc: "",
          subject: "",
          body: `Dear ${client.full_name},\n\n`,
        })
      );
    } catch {
      // ignore storage errors — the composer will just open empty
    }
    router.push("/email");
  }

  // Reusable "Email" action shown next to the client's phone/contact details.
  const emailBtn = client.email ? (
    <button
      onClick={emailClient}
      className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border border-blue-200 text-blue-700 hover:bg-blue-50 transition"
      title={`Compose an email to ${client.email}`}
    >
      <Mail size={14} /> Email
    </button>
  ) : null;

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

  async function deletePolicy(policyId: string, policyLabel: string) {
    if (
      !confirm(
        `Delete "${policyLabel}"? This removes the policy and its stored document. This cannot be undone.`
      )
    )
      return;
    setDeletingPolicy(policyId);
    setNotice(null);
    try {
      const res = await fetch(`/api/policies?id=${policyId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Delete failed");
      // If that was the client's last policy, the client was removed too.
      if (data.clientDeleted) {
        router.push("/clients");
      }
      router.refresh();
    } catch (e) {
      setNotice({
        type: "err",
        msg: e instanceof Error ? e.message : "Delete failed.",
      });
      setDeletingPolicy(null);
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
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight break-words">
                {client.full_name}
              </h1>
              {/* Phone gets its own line directly below the name. */}
              <div className="mt-1.5 text-sm text-muted">
                {editingPhone ? (
                  <div className="flex items-center gap-2 flex-wrap">
                    <input
                      type="tel"
                      inputMode="numeric"
                      autoFocus
                      maxLength={10}
                      value={phoneInput}
                      onChange={(e) =>
                        setPhoneInput(e.target.value.replace(/\D/g, "").slice(0, 10))
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter") savePhone();
                        if (e.key === "Escape") setEditingPhone(false);
                      }}
                      placeholder="10-digit mobile number"
                      className="rounded-full border border-border bg-background px-3.5 py-1.5 text-sm outline-none focus:ring-2 focus:ring-foreground/10 w-48"
                    />
                    <button
                      onClick={savePhone}
                      disabled={savingPhone || phoneInput.length !== 10}
                      className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full bg-foreground text-background hover:opacity-90 transition disabled:opacity-50"
                    >
                      {savingPhone ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Check size={14} />
                      )}
                      Save
                    </button>
                    <button
                      onClick={() => {
                        setEditingPhone(false);
                        setPhoneInput("");
                      }}
                      className="text-xs font-medium px-3 py-1.5 rounded-full border border-border hover:bg-black/[.03] transition"
                    >
                      Cancel
                    </button>
                  </div>
                ) : phone ? (
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="inline-flex items-center gap-1.5">
                      <Phone size={14} className="shrink-0" />
                      {mobile ? (
                        <a
                          href={`tel:+91${mobile}`}
                          className="hover:text-foreground transition"
                        >
                          +91 {mobile}
                        </a>
                      ) : (
                        <span>{phone}</span>
                      )}
                    </span>
                    {mobile && (
                      <a
                        href={`https://wa.me/91${mobile}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border border-green-200 text-green-700 hover:bg-green-50 transition"
                      >
                        <MessageCircle size={14} /> WhatsApp
                      </a>
                    )}
                    {emailBtn}
                    {/* Only manually-entered numbers are editable; extracted stay fixed. */}
                    {phoneManual && (
                      <button
                        onClick={startEditPhone}
                        className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border border-border hover:bg-black/[.03] transition"
                      >
                        <Pencil size={13} /> Edit
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-3 flex-wrap">
                    <button
                      onClick={() => {
                        setPhoneInput("");
                        setEditingPhone(true);
                      }}
                      className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border border-dashed border-border text-muted hover:text-foreground hover:border-foreground/40 transition"
                    >
                      <Phone size={14} /> Add mobile number
                    </button>
                    {emailBtn}
                  </div>
                )}
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5 text-sm text-muted">
                {client.email && (
                  <span className="inline-flex items-center gap-1 min-w-0">
                    <AtSign size={14} className="shrink-0" />{" "}
                    <span className="break-all">{client.email}</span>
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
              // LIC policies (from a Premium Due List) show LIC-specific fields:
              // D.o.C, Plan/Term, Mode, FUP and the mode-aware next due date.
              const raw = p.raw_extract as {
                source?: string;
                fup?: string;
                paid_through?: string;
              } | null;
              const isLic = raw?.source === "lic_premium_due";
              const licNextDue = isLic
                ? getLicNextDueISO(p.start_date, p.mode, undefined, raw?.paid_through)
                : null;
              return (
                <div
                  key={p.id}
                  className="rounded-2xl border border-border bg-card p-5"
                >
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="min-w-0">
                      <p className="font-semibold break-words">
                        {p.product_name || p.policy_type || "Policy"}
                        {proj && (
                          <span className="ml-2 inline-block text-xs font-medium text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                            premium change soon
                          </span>
                        )}
                      </p>
                      <p className="text-sm text-muted break-words">
                        {companyLabel(p.company, p.product_name) || "—"} · Policy #{p.policy_number || "No number"}
                        {p.policy_type && p.product_name && p.product_name !== p.policy_type && (
                          <span className="ml-2">· {p.policy_type}</span>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap justify-end w-full sm:w-auto">
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
                      <button
                        onClick={() => {
                          const { webUrl, subject, body } = buildIntimation(
                            p,
                            client.full_name,
                            phone,
                            p.sum_insured,
                            agentName,
                            agentPhone
                          );
                          openIntimation(webUrl, subject, body);
                        }}
                        className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border border-blue-600 text-blue-700 hover:bg-blue-600 hover:text-white transition"
                        title="Draft a mediclaim intimation email (opens Gmail)"
                      >
                        <Send size={14} />
                        Intimation
                      </button>
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
                      {canDelete && (
                        <button
                          onClick={() =>
                            deletePolicy(
                              p.id,
                              p.product_name || p.policy_type || "Policy"
                            )
                          }
                          disabled={deletingPolicy === p.id}
                          className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border border-red-200 text-red-600 hover:bg-red-50 transition disabled:opacity-50"
                          title="Delete this policy"
                        >
                          {deletingPolicy === p.id ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <Trash2 size={14} />
                          )}
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                  {isLic ? (
                    <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4 text-sm">
                      <Field label="D.o.C" value={shortDate(p.start_date)} />
                      <Field label="Plan / Term" value={p.policy_type || "—"} />
                      <Field label="Mode" value={p.mode || "—"} />
                      <Field
                        label="Premium (installment)"
                        value={money(p.premium)}
                      />
                      <Field label="FUP" value={raw?.fup || "—"} />
                      <Field label="Next due" value={shortDate(licNextDue)} />
                    </dl>
                  ) : (
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
                      {p.policy_holder_type && (
                        <Field label="Insured Type" value={p.policy_holder_type} />
                      )}
                    </dl>
                  )}
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
