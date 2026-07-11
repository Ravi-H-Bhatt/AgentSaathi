"use client";

import { useState } from "react";
import Link from "next/link";
import { X, Copy, Check, Send, Loader2, CheckCircle2, MessageCircle } from "lucide-react";
import { shortDate, daysUntil, money, getAdjustedRenewalDate } from "@/lib/format";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";

export interface RenewalItem {
  id: string;
  clientId: string;
  clientName: string;
  clientEmail: string | null;
  clientPhone: string | null;
  policyType: string | null;
  company: string | null;
  policyNumber: string | null;
  sumInsured: number | null;
  premium: number | null;
  renewalDate: string | null;
  mode: string | null;
}

/**
 * Extract a VALID 10-digit Indian mobile from a raw field.
 * Rejects policy numbers, landlines, and anything that isn't a real mobile.
 * Returns the 10-digit number (no country code) or null.
 */
function validMobile10(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let digits = raw.replace(/\D/g, "");
  // Strip a leading country code / trunk prefix if present.
  if (digits.length === 12 && digits.startsWith("91")) digits = digits.slice(2);
  else if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1);
  // Must be EXACTLY 10 digits and start with 6-9 (Indian mobile series).
  if (/^[6-9]\d{9}$/.test(digits)) return digits;
  return null;
}

/** Build a wa.me link (opens the agent's own WhatsApp with a pre-filled note). */
function buildWhatsAppLink(item: RenewalItem, agentName?: string): string | null {
  const mobile = validMobile10(item.clientPhone);
  if (!mobile) return null;
  const digits = "91" + mobile; // India country code

  const adjustedDate = getAdjustedRenewalDate(item.renewalDate);
  const date = adjustedDate
    ? shortDate(adjustedDate)
    : item.renewalDate
    ? shortDate(item.renewalDate)
    : "soon";

  const lines = [
    `Dear ${item.clientName},`,
    "",
    `This is a friendly reminder that your policy is due for renewal on ${date}.`,
    "",
    "*Policy Details*",
    `• Plan: ${item.policyType || "—"}`,
    item.company ? `• Company: ${item.company}` : "",
    item.policyNumber ? `• Policy No: ${item.policyNumber}` : "",
    item.sumInsured ? `• Sum Insured: ${money(item.sumInsured)}` : "",
    item.premium ? `• Premium: ${money(item.premium)}${item.mode ? ` (${item.mode})` : ""}` : "",
    `• Renewal Date: ${date}`,
    "",
    "Please renew on time to keep your coverage active. Feel free to reach out for any assistance. 🙏",
    "",
    "Regards,",
    agentName || "Your Insurance Agent",
  ].filter((l) => l !== "");

  return `https://wa.me/${digits}?text=${encodeURIComponent(lines.join("\n"))}`;
}

function buildEmailDraft(item: RenewalItem, agentName?: string): { subject: string; body: string } {
  const adjustedDate = getAdjustedRenewalDate(item.renewalDate);
  const date = adjustedDate ? shortDate(adjustedDate) : (item.renewalDate ? shortDate(item.renewalDate) : "soon");
  const subject = `Renewal Reminder: ${item.policyType || "Policy"} due ${date}`;
  const body = `Dear ${item.clientName},

I hope you are doing well. This is a friendly reminder that the following policy is due for renewal on ${date}.

Policy Details:
• Plan: ${item.policyType || "—"}
• Policy Number: ${item.policyNumber || "—"}
${item.company ? `• Company: ${item.company}\n` : ""}• Sum Assured: ${money(item.sumInsured)}
• Premium: ${money(item.premium)}${item.mode ? ` (${item.mode})` : ""}
• Renewal Date: ${date}

Please make sure to renew on time to keep your coverage active and uninterrupted. Feel free to reach out if you have any questions or need assistance with the renewal process.

Regards,
${agentName || "Your Insurance Agent"}`;
  return { subject, body };
}

export function RenewalsList({
  renewals,
  agentName,
}: {
  renewals: RenewalItem[];
  agentName?: string;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<RenewalItem | null>(null);
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [copied, setCopied] = useState<"subject" | "body" | null>(null);
  const [renewingId, setRenewingId] = useState<string | null>(null);
  const [confirmRenewId, setConfirmRenewId] = useState<string | null>(null);

  const draft = selected ? buildEmailDraft(selected, agentName) : null;

  async function sendEmail() {
    if (!selected) return;
    setSending(true);
    setSendResult(null);
    try {
      const res = await fetch("/api/send-renewal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ policyId: selected.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setSendResult({ ok: true, msg: "Reminder email sent successfully." });
    } catch (e) {
      setSendResult({
        ok: false,
        msg: e instanceof Error ? e.message : "Failed to send.",
      });
    } finally {
      setSending(false);
    }
  }

  async function copy(text: string, which: "subject" | "body") {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(which);
      setTimeout(() => setCopied(null), 1600);
    } catch { /* ignore */ }
  }

  async function markAsRenewed(policyId: string) {
    setRenewingId(policyId);
    try {
      const res = await fetch("/api/policies/mark-renewed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ policyId }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to mark as renewed");
      }
      // Refresh the page to update the renewals list
      router.refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to mark as renewed");
    } finally {
      setRenewingId(null);
      setConfirmRenewId(null);
    }
  }

  return (
    <>
      <ul className="divide-y divide-border">
        {renewals.map((item) => {
          const dleft = daysUntil(item.renewalDate);
          const adjustedDate = getAdjustedRenewalDate(item.renewalDate);
          const isConfirming = confirmRenewId === item.id;
          const isProcessing = renewingId === item.id;
          const waLink = buildWhatsAppLink(item, agentName);
          
          return (
            <li key={item.id} className="flex items-center justify-between px-4 sm:px-5 py-4 gap-2 sm:gap-3 hover:bg-black/[.02] transition-colors">
              <Link
                href={`/clients/${item.clientId}`}
                className="min-w-0 flex-1 group"
              >
                <p className="font-medium truncate group-hover:underline underline-offset-2">
                  {item.clientName}
                </p>
                <p className="text-sm text-muted truncate">
                  {item.policyType || "Policy"}
                  {item.company ? ` · ${item.company}` : ""}
                  {item.policyNumber ? ` · ${item.policyNumber}` : ""}
                </p>
              </Link>
              <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                <div className="text-right w-[72px] sm:w-24 shrink-0">
                  <p className="text-[13px] sm:text-sm font-medium whitespace-nowrap">{shortDate(adjustedDate)}</p>
                  <p className={`text-xs font-semibold ${
                    dleft != null && dleft < 0 
                      ? "text-red-600" 
                      : dleft != null && dleft <= 7 
                      ? "text-red-600" 
                      : "text-muted"
                  }`}>
                    {dleft != null
                      ? dleft < 0 
                        ? `OVERDUE ${Math.abs(dleft)}d` 
                        : dleft === 0
                        ? "DUE TODAY"
                        : `in ${dleft}d`
                      : ""}
                  </p>
                </div>
                
                {/* Action area. On desktop it's a fixed width so the date
                    column stays aligned; on mobile it shrinks to icon buttons
                    so the client name keeps enough room. */}
                <div className="flex items-center justify-end gap-1.5 sm:gap-2 w-auto sm:w-[210px] shrink-0">
                {isConfirming ? (
                  <>
                    <button
                      onClick={() => markAsRenewed(item.id)}
                      disabled={isProcessing}
                      className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full bg-green-600 text-white hover:bg-green-700 transition-all duration-200 disabled:opacity-50"
                      title="Confirm renewal"
                    >
                      {isProcessing ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : (
                        <CheckCircle2 size={13} />
                      )}
                      <span>Confirm</span>
                    </button>
                    <button
                      onClick={() => setConfirmRenewId(null)}
                      disabled={isProcessing}
                      className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border border-border hover:bg-black/[.03] transition-all duration-200 disabled:opacity-50"
                    >
                      <X size={13} />
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => setConfirmRenewId(item.id)}
                      className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border border-border text-foreground hover:bg-foreground hover:text-background hover:border-foreground transition-all duration-200"
                      title="Mark policy as renewed"
                    >
                      <CheckCircle2 size={13} />
                      <span className="hidden sm:inline">Renewed</span>
                    </button>
                    {/* WhatsApp shows ONLY when the client has a valid mobile */}
                    {waLink && (
                      <a
                        href={waLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border border-green-600 text-green-700 hover:bg-green-600 hover:text-white transition-all duration-200"
                        title={`Send WhatsApp reminder to ${item.clientPhone}`}
                      >
                        <MessageCircle size={13} />
                        <span className="hidden sm:inline">WhatsApp</span>
                      </a>
                    )}
                  </>
                )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      {/* Email draft modal */}
      <AnimatePresence>
        {selected && draft && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelected(null)}
              className="fixed inset-0 bg-black/40 z-50"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 16 }}
              transition={{ duration: 0.2 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[95%] max-w-lg max-h-[88vh] overflow-y-auto rounded-2xl border border-border bg-card shadow-xl flex flex-col"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-border sticky top-0 bg-card z-10">
                <div>
                  <h3 className="font-semibold">Renewal Email</h3>
                  <p className="text-xs text-muted mt-0.5">{selected.clientName}</p>
                </div>
                <button onClick={() => setSelected(null)} className="p-1.5 rounded-lg hover:bg-black/[.04]">
                  <X size={18} />
                </button>
              </div>

              <div className="p-5 space-y-4 flex-1">
                {/* No email warning */}
                {!selected.clientEmail && (
                  <div className="rounded-xl bg-amber-50 text-amber-800 px-4 py-3 text-sm">
                    This client has no email address — you can copy the draft and send manually.
                  </div>
                )}

                {/* Send result */}
                {sendResult && (
                  <div className={`rounded-xl px-4 py-3 text-sm ${sendResult.ok ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                    {sendResult.msg}
                  </div>
                )}

                {/* Subject */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-medium text-muted uppercase tracking-wide">Subject</label>
                    <button
                      onClick={() => copy(draft.subject, "subject")}
                      className="inline-flex items-center gap-1 text-xs text-muted hover:text-foreground transition"
                    >
                      {copied === "subject" ? <><Check size={12} /> Copied</> : <><Copy size={12} /> Copy</>}
                    </button>
                  </div>
                  <div className="rounded-xl border border-border bg-background px-3 py-2.5 text-sm">
                    {draft.subject}
                  </div>
                </div>

                {/* Body */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-medium text-muted uppercase tracking-wide">Body</label>
                    <button
                      onClick={() => copy(draft.body, "body")}
                      className="inline-flex items-center gap-1 text-xs text-muted hover:text-foreground transition"
                    >
                      {copied === "body" ? <><Check size={12} /> Copied</> : <><Copy size={12} /> Copy</>}
                    </button>
                  </div>
                  <pre className="rounded-xl border border-border bg-background px-3 py-2.5 text-sm font-sans leading-relaxed whitespace-pre-wrap overflow-auto max-h-72">
                    {draft.body}
                  </pre>
                </div>
              </div>

              {/* Actions */}
              <div className="px-5 py-4 border-t border-border bg-card sticky bottom-0 flex gap-3">
                {selected.clientEmail ? (
                  <button
                    onClick={sendEmail}
                    disabled={sending || !!sendResult?.ok}
                    className="flex-1 inline-flex items-center justify-center gap-2 text-sm font-medium py-2.5 rounded-full bg-foreground text-background hover:opacity-90 transition disabled:opacity-50"
                  >
                    {sending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                    {sending ? "Sending…" : sendResult?.ok ? "Sent ✓" : `Send to ${selected.clientEmail}`}
                  </button>
                ) : (
                  <button
                    onClick={() => copy(draft.body, "body")}
                    className="flex-1 inline-flex items-center justify-center gap-2 text-sm font-medium py-2.5 rounded-full border border-border hover:bg-black/[.03] transition"
                  >
                    <Copy size={15} />
                    {copied === "body" ? "Copied!" : "Copy draft"}
                  </button>
                )}
                <button
                  onClick={() => setSelected(null)}
                  className="px-5 py-2.5 rounded-full border border-border text-sm font-medium hover:bg-black/[.03] transition"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
