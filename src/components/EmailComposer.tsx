"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Send, Save, Trash2, Mail, Bot, Sparkles } from "lucide-react";

interface Draft {
  id: string;
  to_email: string;
  cc_email: string | null;
  subject: string;
  body: string;
  updated_at: string;
}

interface AiMessage {
  role: "user" | "assistant";
  content: string;
}

export function EmailComposer({ agentName }: { agentName: string }) {
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [selectedDraft, setSelectedDraft] = useState<Draft | null>(null);
  const [to, setTo] = useState("");
  const [cc, setCc] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // AI Assistant state
  const [aiMessages, setAiMessages] = useState<AiMessage[]>([
    {
      role: "assistant",
      content:
        "Hi! I can help you draft professional emails. Tell me:\n• Which client/policy to write about\n• What type of email (renewal, follow-up, etc.)\n• Any specific details to include\n\nI'll generate a complete email for you!",
    },
  ]);
  const [aiInput, setAiInput] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const aiScrollRef = useRef<HTMLDivElement>(null);

  // Load drafts
  const loadDrafts = useCallback(async () => {
    try {
      const res = await fetch("/api/email/drafts");
      const data = await res.json();
      setDrafts(data.drafts || []);
    } catch {
      // Ignore
    }
  }, []);

  useEffect(() => {
    loadDrafts();
  }, [loadDrafts]);

  // Auto-scroll AI chat
  useEffect(() => {
    aiScrollRef.current?.scrollTo({
      top: aiScrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [aiMessages]);

  // Save draft
  async function saveDraft() {
    if (!to.trim() || !subject.trim()) {
      setError("To and Subject are required");
      setTimeout(() => setError(null), 3000);
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/email/drafts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedDraft?.id || null,
          to_email: to.trim(),
          cc_email: cc.trim() || null,
          subject: subject.trim(),
          body: body.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save");

      setSuccess("Draft saved!");
      setTimeout(() => setSuccess(null), 2000);
      await loadDrafts();

      if (data.draft) {
        setSelectedDraft(data.draft);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
      setTimeout(() => setError(null), 3000);
    } finally {
      setSaving(false);
    }
  }

  // Send email
  async function sendEmail() {
    if (!to.trim() || !subject.trim() || !body.trim()) {
      setError("To, Subject, and Body are required");
      setTimeout(() => setError(null), 3000);
      return;
    }

    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: to.trim(),
          cc: cc.trim() || null,
          subject: subject.trim(),
          body: body.trim(),
          agentName: agentName,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send");

      setSuccess("Email sent successfully!");
      setTimeout(() => setSuccess(null), 3000);

      clearForm();

      if (selectedDraft?.id) {
        await fetch(`/api/email/drafts?id=${selectedDraft.id}`, {
          method: "DELETE",
        });
        await loadDrafts();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to send");
      setTimeout(() => setError(null), 3000);
    } finally {
      setSending(false);
    }
  }

  // Load a draft
  function loadDraft(draft: Draft) {
    setSelectedDraft(draft);
    setTo(draft.to_email);
    setCc(draft.cc_email || "");
    setSubject(draft.subject);
    setBody(draft.body);
    setError(null);
    setSuccess(null);
  }

  // Delete draft
  async function deleteDraft(id: string) {
    try {
      await fetch(`/api/email/drafts?id=${id}`, { method: "DELETE" });
      await loadDrafts();
      if (selectedDraft?.id === id) {
        clearForm();
      }
    } catch {
      setError("Failed to delete draft");
      setTimeout(() => setError(null), 3000);
    }
  }

  // Clear form
  function clearForm() {
    setSelectedDraft(null);
    setTo("");
    setCc("");
    setSubject("");
    setBody("");
    setError(null);
    setSuccess(null);
  }

  // AI: Send message
  async function sendAiMessage() {
    const q = aiInput.trim();
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
          history: aiMessages.slice(1).map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });
      const data = await res.json();

      // Check if AI returned structured email data
      if (data.email) {
        // Auto-fill the form
        if (data.email.to) setTo(data.email.to);
        if (data.email.cc) setCc(data.email.cc);
        if (data.email.subject) setSubject(data.email.subject);
        if (data.email.body) setBody(data.email.body);

        setAiMessages([
          ...next,
          {
            role: "assistant",
            content:
              data.answer ||
              "I've filled in the email form for you. Review and edit as needed, then click Send!",
          },
        ]);
      } else {
        setAiMessages([
          ...next,
          {
            role: "assistant",
            content: data.answer || "Sorry, I couldn't help with that.",
          },
        ]);
      }
    } catch {
      setAiMessages([
        ...next,
        {
          role: "assistant",
          content: "Network error. Please try again.",
        },
      ]);
    } finally {
      setAiLoading(false);
    }
  }

  return (
    <div className="flex h-full">
      {/* LEFT: Email Form */}
      <div className="w-[45%] flex flex-col border-r border-border">
        {/* Header */}
        <div className="px-4 py-3 border-b border-border">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Mail size={16} /> Compose Email
            </h3>
            {selectedDraft && (
              <button
                onClick={clearForm}
                className="text-xs text-muted hover:text-foreground px-2 py-1 rounded hover:bg-black/[.04]"
              >
                New
              </button>
            )}
          </div>
        </div>

        {/* Drafts List */}
        {drafts.length > 0 && (
          <div className="border-b border-border">
            <div className="px-4 py-2">
              <p className="text-xs font-medium text-muted mb-2">
                Saved Drafts
              </p>
              <div className="space-y-1 max-h-24 overflow-y-auto">
                {drafts.map((draft) => (
                  <div
                    key={draft.id}
                    className={`flex items-center justify-between p-2 rounded-lg text-xs hover:bg-black/[.04] cursor-pointer ${
                      selectedDraft?.id === draft.id ? "bg-black/[.06]" : ""
                    }`}
                    onClick={() => loadDraft(draft)}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{draft.subject}</p>
                      <p className="text-muted truncate">To: {draft.to_email}</p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteDraft(draft.id);
                      }}
                      className="ml-2 p-1 hover:bg-red-50 hover:text-red-600 rounded"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Form */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {error && (
            <div className="text-xs bg-red-50 text-red-600 px-3 py-2 rounded-lg">
              {error}
            </div>
          )}
          {success && (
            <div className="text-xs bg-green-50 text-green-600 px-3 py-2 rounded-lg">
              {success}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium mb-1.5">To *</label>
            <input
              type="email"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="recipient@example.com"
              className="w-full px-3 py-2 text-sm border border-border rounded-lg outline-none focus:ring-2 focus:ring-foreground/10"
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1.5">CC</label>
            <input
              type="email"
              value={cc}
              onChange={(e) => setCc(e.target.value)}
              placeholder="cc@example.com (optional)"
              className="w-full px-3 py-2 text-sm border border-border rounded-lg outline-none focus:ring-2 focus:ring-foreground/10"
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1.5">
              Subject *
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Email subject"
              className="w-full px-3 py-2 text-sm border border-border rounded-lg outline-none focus:ring-2 focus:ring-foreground/10"
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1.5">Body *</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Email body..."
              rows={10}
              className="w-full px-3 py-2 text-sm border border-border rounded-lg outline-none focus:ring-2 focus:ring-foreground/10 resize-none"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="border-t border-border p-3 flex gap-2">
          <button
            onClick={sendEmail}
            disabled={sending || !to.trim() || !subject.trim() || !body.trim()}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-foreground text-background rounded-lg text-sm font-medium hover:opacity-90 transition disabled:opacity-40"
          >
            <Send size={14} />
            {sending ? "Sending..." : "Send"}
          </button>
          <button
            onClick={saveDraft}
            disabled={saving || !to.trim() || !subject.trim()}
            className="px-4 py-2.5 border border-border rounded-lg text-sm font-medium hover:bg-black/[.04] transition disabled:opacity-40"
            title="Save Draft"
          >
            <Save size={14} />
          </button>
        </div>
      </div>

      {/* RIGHT: AI Assistant */}
      <div className="flex-1 flex flex-col">
        {/* AI Header */}
        <div className="px-4 py-3 border-b border-border bg-gradient-to-r from-purple-50 to-blue-50">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
              <Bot size={16} className="text-white" />
            </div>
            <div>
              <h3 className="text-sm font-semibold flex items-center gap-1.5">
                AI Email Assistant
                <Sparkles size={12} className="text-purple-500" />
              </h3>
              <p className="text-xs text-muted">Ask me to draft an email</p>
            </div>
          </div>
        </div>

        {/* AI Messages */}
        <div
          ref={aiScrollRef}
          className="flex-1 overflow-y-auto p-4 space-y-3 bg-gradient-to-b from-purple-50/30 to-transparent"
        >
          {aiMessages.map((m, i) => (
            <div
              key={i}
              className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                  m.role === "user"
                    ? "bg-foreground text-background"
                    : "bg-white border border-border shadow-sm"
                }`}
              >
                {m.content}
              </div>
            </div>
          ))}
          {aiLoading && (
            <div className="flex justify-start">
              <div className="bg-white border border-border rounded-2xl px-4 py-3 shadow-sm">
                <span className="inline-flex gap-1">
                  <Dot />
                  <Dot delay="0.15s" />
                  <Dot delay="0.3s" />
                </span>
              </div>
            </div>
          )}
        </div>

        {/* AI Input */}
        <div className="border-t border-border p-3 bg-white">
          <div className="flex items-end gap-2">
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
              placeholder="E.g., 'Draft a renewal email for Rahul Sharma's LIC policy'"
              className="flex-1 resize-none rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500/20 max-h-24"
            />
            <button
              onClick={sendAiMessage}
              disabled={aiLoading || !aiInput.trim()}
              className="h-10 w-10 shrink-0 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 text-white flex items-center justify-center hover:opacity-90 transition disabled:opacity-40 shadow-md"
              aria-label="Send"
            >
              <Send size={16} />
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
