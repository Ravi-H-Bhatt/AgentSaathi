"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Bot, Mail, ArrowUp, Users, Check, ChevronDown, FileText } from "lucide-react";
import { WELCOME_EMAIL } from "@/lib/welcomeEmail";

interface EmailRecipient {
  id: string;
  name: string;
  email: string;
  role: "agent" | "colleague";
  ownerName: string | null;
}

interface AiMessage {
  role: "user" | "assistant";
  content: string;
}

type Audience = "all" | "agents" | "colleagues" | "custom";

const SUGGESTIONS = [
  { title: "Announce a new feature", sub: "to the whole team" },
  { title: "Send a policy reminder notice", sub: "for all agents" },
  { title: "Share a monthly update", sub: "with agents and colleagues" },
  { title: "Write a welcome message", sub: "for new team members" },
];

export function AdminEmailComposer() {
  const [recipients, setRecipients] = useState<EmailRecipient[]>([]);
  const [audience, setAudience] = useState<Audience>("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [pickerOpen, setPickerOpen] = useState(false);

  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [aiMessages, setAiMessages] = useState<AiMessage[]>([]);
  const [aiInput, setAiInput] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const aiScrollRef = useRef<HTMLDivElement>(null);

  const loadRecipients = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/recipients");
      const data = await res.json();
      setRecipients(data.recipients || []);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    loadRecipients();
  }, [loadRecipients]);

  useEffect(() => {
    aiScrollRef.current?.scrollTo({
      top: aiScrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [aiMessages]);

  const agents = recipients.filter((r) => r.role === "agent");
  const colleagues = recipients.filter((r) => r.role === "colleague");

  /** Resolve the current audience selection to a list of recipients. */
  function resolveRecipients(): EmailRecipient[] {
    if (audience === "all") return recipients;
    if (audience === "agents") return agents;
    if (audience === "colleagues") return colleagues;
    return recipients.filter((r) => selectedIds.has(r.id));
  }

  const chosen = resolveRecipients();

  function toggleId(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function sendEmail() {
    const toList = chosen.map((r) => r.email).filter(Boolean);
    if (toList.length === 0) {
      setError("Select at least one recipient");
      setTimeout(() => setError(null), 3000);
      return;
    }
    if (!subject.trim() || !body.trim()) {
      setError("Subject and body are required");
      setTimeout(() => setError(null), 3000);
      return;
    }

    setSending(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("to", toList.join(", "));
      formData.append("subject", subject.trim());
      formData.append("body", body.trim());

      const res = await fetch("/api/email/send", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send");

      setSuccess(`Email sent to ${toList.length} recipient${toList.length > 1 ? "s" : ""}!`);
      setTimeout(() => setSuccess(null), 4000);
      setSubject("");
      setBody("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to send");
      setTimeout(() => setError(null), 4000);
    } finally {
      setSending(false);
    }
  }

  async function sendAiMessage(text?: string) {
    const q = (text ?? aiInput).trim();
    if (!q || aiLoading) return;
    const next = [...aiMessages, { role: "user" as const, content: q }];
    setAiMessages(next);
    setAiInput("");
    setAiLoading(true);
    try {
      const res = await fetch("/api/email/ai-draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: q,
          history: aiMessages.map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      const data = await res.json();
      if (data.email) {
        if (data.email.subject) setSubject(data.email.subject);
        if (data.email.body) setBody(data.email.body);
        setAiMessages([
          ...next,
          {
            role: "assistant",
            content:
              data.answer ||
              "Done! I've filled in the subject and body on the left. Pick your recipients and click Send.",
          },
        ]);
      } else {
        setAiMessages([
          ...next,
          {
            role: "assistant",
            content: data.answer || "I'm here to help. Please clarify your request.",
          },
        ]);
      }
    } catch {
      setAiMessages([
        ...next,
        { role: "assistant", content: "Network error. Please try again." },
      ]);
    } finally {
      setAiLoading(false);
    }
  }

  const audienceLabel: Record<Audience, string> = {
    all: `Everyone (${recipients.length})`,
    agents: `All agents (${agents.length})`,
    colleagues: `All colleagues (${colleagues.length})`,
    custom: `Selected (${selectedIds.size})`,
  };

  return (
    <div className="flex flex-col lg:flex-row gap-5 h-full min-h-0">
      {/* LEFT: Email Form */}
      <div className="w-full lg:w-1/2 flex flex-col bg-white border border-border rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex items-center gap-2 shrink-0">
          <Mail size={18} />
          <h2 className="text-base font-semibold">Send as Admin</h2>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4 min-h-0">
          {error && (
            <div className="text-sm bg-red-50 text-red-700 px-4 py-3 rounded-lg border border-red-200">
              {error}
            </div>
          )}
          {success && (
            <div className="text-sm bg-green-50 text-green-700 px-4 py-3 rounded-lg border border-green-200">
              {success}
            </div>
          )}

          {/* Audience selector */}
          <div>
            <label className="block text-sm font-medium mb-2 flex items-center gap-1.5">
              <Users size={14} /> To
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(["all", "agents", "colleagues", "custom"] as Audience[]).map((a) => (
                <button
                  key={a}
                  onClick={() => {
                    setAudience(a);
                    if (a === "custom") setPickerOpen(true);
                  }}
                  className={`text-sm px-3 py-2 rounded-lg border text-left transition ${
                    audience === a
                      ? "border-foreground bg-foreground text-background"
                      : "border-border hover:border-foreground/30"
                  }`}
                >
                  {audienceLabel[a]}
                </button>
              ))}
            </div>

            {audience === "custom" && (
              <div className="mt-2 border border-border rounded-lg overflow-hidden">
                <button
                  onClick={() => setPickerOpen((v) => !v)}
                  className="w-full flex items-center justify-between px-3 py-2 text-sm bg-black/[.02] hover:bg-black/[.04] transition"
                >
                  <span>{selectedIds.size} selected</span>
                  <ChevronDown
                    size={16}
                    className={`transition ${pickerOpen ? "rotate-180" : ""}`}
                  />
                </button>
                {pickerOpen && (
                  <div className="max-h-52 overflow-y-auto divide-y divide-border">
                    {recipients.length === 0 && (
                      <p className="px-3 py-3 text-sm text-muted">
                        No agents or colleagues found.
                      </p>
                    )}
                    {recipients.map((r) => {
                      const on = selectedIds.has(r.id);
                      return (
                        <button
                          key={r.id}
                          onClick={() => toggleId(r.id)}
                          className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-black/[.03] transition"
                        >
                          <span
                            className={`h-4 w-4 rounded border flex items-center justify-center shrink-0 ${
                              on ? "bg-foreground border-foreground" : "border-border"
                            }`}
                          >
                            {on && <Check size={12} className="text-background" />}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="text-sm font-medium truncate block">
                              {r.name}
                              <span className="ml-1.5 text-xs text-muted font-normal">
                                {r.role === "colleague"
                                  ? `colleague${r.ownerName ? ` · ${r.ownerName}` : ""}`
                                  : "agent"}
                              </span>
                            </span>
                            <span className="text-xs text-muted truncate block">
                              {r.email}
                            </span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            <p className="text-xs text-muted mt-2">
              {chosen.length} recipient{chosen.length === 1 ? "" : "s"} will receive this email.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Templates</label>
            <button
              onClick={() => {
                setSubject(WELCOME_EMAIL.subject);
                setBody(WELCOME_EMAIL.body);
              }}
              className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-left border border-border rounded-lg hover:border-foreground/30 hover:bg-black/[.02] transition"
            >
              <FileText size={15} className="shrink-0" />
              <span>
                <span className="font-medium">Welcome &amp; Getting Started</span>
                <span className="text-muted"> — autofills the onboarding email</span>
              </span>
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Subject *</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Email subject"
              className="w-full px-4 py-2.5 text-sm border border-border rounded-lg outline-none focus:ring-2 focus:ring-foreground/20 focus:border-foreground transition"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Body *</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write your message here, or ask the AI assistant to draft it..."
              rows={10}
              className="w-full px-4 py-3 text-sm border border-border rounded-lg outline-none focus:ring-2 focus:ring-foreground/20 focus:border-foreground transition resize-none leading-relaxed"
            />
          </div>
        </div>

        <div className="border-t border-border p-4 shrink-0">
          <button
            onClick={sendEmail}
            disabled={sending || chosen.length === 0 || !subject.trim() || !body.trim()}
            className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-foreground text-background rounded-lg text-sm font-medium hover:opacity-90 transition disabled:opacity-40 shadow-sm"
          >
            <ArrowUp size={16} className="rotate-45" />
            {sending ? "Sending..." : "Send Email"}
          </button>
        </div>
      </div>

      {/* RIGHT: AI Assistant */}
      <div className="w-full lg:w-1/2 flex flex-col bg-white border border-border rounded-2xl shadow-sm overflow-hidden min-h-[50vh] lg:min-h-0">
        <div className="px-6 py-4 border-b border-border flex items-center gap-3 shrink-0">
          <div className="h-10 w-10 rounded-full bg-foreground flex items-center justify-center">
            <Bot size={20} className="text-background" />
          </div>
          <div>
            <h2 className="text-base font-semibold">AI Email Assistant</h2>
            <p className="text-xs text-muted">Describe your message, I&apos;ll format it</p>
          </div>
        </div>

        <div ref={aiScrollRef} className="flex-1 overflow-y-auto px-6 py-5 min-h-0">
          {aiMessages.length === 0 ? (
            <div className="h-full flex flex-col">
              <div className="flex-1" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-2">
                {SUGGESTIONS.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => sendAiMessage(`${s.title} ${s.sub}`)}
                    className="text-left p-4 rounded-xl border border-border hover:border-foreground/30 hover:bg-black/[.02] transition"
                  >
                    <p className="text-sm font-medium text-foreground">{s.title}</p>
                    <p className="text-xs text-muted mt-0.5">{s.sub}</p>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {aiMessages.map((m, i) => (
                <div
                  key={i}
                  className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                      m.role === "user"
                        ? "bg-foreground text-background"
                        : "bg-black/[.03] border border-border"
                    }`}
                  >
                    {m.content}
                  </div>
                </div>
              ))}
              {aiLoading && (
                <div className="flex justify-start">
                  <div className="bg-black/[.03] border border-border rounded-2xl px-4 py-3">
                    <span className="inline-flex gap-1">
                      <Dot />
                      <Dot delay="0.15s" />
                      <Dot delay="0.3s" />
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="p-4 shrink-0">
          <div className="relative rounded-2xl border border-border focus-within:border-foreground focus-within:ring-2 focus-within:ring-foreground/10 transition bg-white">
            <textarea
              value={aiInput}
              onChange={(e) => setAiInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendAiMessage();
                }
              }}
              rows={2}
              placeholder="E.g., Draft a friendly reminder to submit monthly reports by Friday"
              className="w-full resize-none bg-transparent px-4 pt-3 pb-12 text-sm outline-none max-h-40"
            />
            <button
              onClick={() => sendAiMessage()}
              disabled={aiLoading || !aiInput.trim()}
              className="absolute bottom-3 right-3 h-9 w-9 rounded-full bg-foreground text-background flex items-center justify-center hover:opacity-90 transition disabled:opacity-30"
              aria-label="Send"
            >
              <ArrowUp size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Dot({ delay = "0s" }: { delay?: string }) {
  return (
    <span
      className="h-1.5 w-1.5 rounded-full bg-muted animate-bounce inline-block"
      style={{ animationDelay: delay }}
    />
  );
}
