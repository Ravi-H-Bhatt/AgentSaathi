"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Send, Save, Trash2, Mail, Bot, Paperclip, X } from "lucide-react";

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

export default function EmailPage() {
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [selectedDraft, setSelectedDraft] = useState<Draft | null>(null);
  const [to, setTo] = useState("");
  const [cc, setCc] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [attachments, setAttachments] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // AI Assistant state
  const [aiMessages, setAiMessages] = useState<AiMessage[]>([
    {
      role: "assistant",
      content:
        "Hello! I can help you draft professional emails.\n\nTell me:\n• Which client or policy to write about\n• What type of email (renewal reminder, follow-up, etc.)\n• Any specific details to include\n\nI'll generate a complete email for you!",
    },
  ]);
  const [aiInput, setAiInput] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const aiScrollRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    aiScrollRef.current?.scrollTo({
      top: aiScrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [aiMessages]);

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

  async function sendEmail() {
    if (!to.trim() || !subject.trim() || !body.trim()) {
      setError("To, Subject, and Body are required");
      setTimeout(() => setError(null), 3000);
      return;
    }

    setSending(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("to", to.trim());
      if (cc.trim()) formData.append("cc", cc.trim());
      formData.append("subject", subject.trim());
      formData.append("body", body.trim());

      for (const file of attachments) {
        formData.append("attachments", file);
      }

      const res = await fetch("/api/email/send", {
        method: "POST",
        body: formData,
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

  function loadDraft(draft: Draft) {
    setSelectedDraft(draft);
    setTo(draft.to_email);
    setCc(draft.cc_email || "");
    setSubject(draft.subject);
    setBody(draft.body);
    setError(null);
    setSuccess(null);
  }

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

  function clearForm() {
    setSelectedDraft(null);
    setTo("");
    setCc("");
    setSubject("");
    setBody("");
    setAttachments([]);
    setError(null);
    setSuccess(null);
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    setAttachments((prev) => [...prev, ...files]);
  }

  function removeAttachment(index: number) {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  }

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

      if (data.email) {
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
              "✓ Email drafted! Review the form on the left and click Send when ready.",
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
    <div className="h-full flex flex-col">
      <div className="flex-1 flex gap-6 min-h-0">
        {/* LEFT: Email Form */}
        <div className="w-1/2 flex flex-col bg-white border border-border rounded-xl shadow-sm">
          <div className="px-6 py-4 border-b border-border">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Mail size={20} /> Compose Email
              </h2>
              {selectedDraft && (
                <button
                  onClick={clearForm}
                  className="text-sm text-muted hover:text-foreground px-3 py-1.5 rounded-lg hover:bg-black/[.04] transition"
                >
                  New Email
                </button>
              )}
            </div>
          </div>

          {drafts.length > 0 && (
            <div className="px-6 py-3 border-b border-border bg-black/[.02]">
              <p className="text-xs font-medium text-muted mb-2">Saved Drafts</p>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {drafts.map((draft) => (
                  <button
                    key={draft.id}
                    onClick={() => loadDraft(draft)}
                    className={`shrink-0 px-3 py-2 rounded-lg text-xs border transition ${
                      selectedDraft?.id === draft.id
                        ? "border-foreground bg-foreground text-background"
                        : "border-border bg-white hover:border-foreground/30"
                    }`}
                  >
                    <div className="font-medium truncate max-w-[120px]">
                      {draft.subject}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex-1 overflow-y-auto p-6 space-y-4">
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

            <div>
              <label className="block text-sm font-medium mb-2">To *</label>
              <input
                type="email"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                placeholder="recipient@example.com"
                className="w-full px-4 py-3 text-sm border border-border rounded-lg outline-none focus:ring-2 focus:ring-foreground/20 focus:border-foreground transition"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">CC</label>
              <input
                type="email"
                value={cc}
                onChange={(e) => setCc(e.target.value)}
                placeholder="cc@example.com (optional)"
                className="w-full px-4 py-3 text-sm border border-border rounded-lg outline-none focus:ring-2 focus:ring-foreground/20 focus:border-foreground transition"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Subject *</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Email subject"
                className="w-full px-4 py-3 text-sm border border-border rounded-lg outline-none focus:ring-2 focus:ring-foreground/20 focus:border-foreground transition"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Body *</label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Write your message here..."
                rows={12}
                className="w-full px-4 py-3 text-sm border border-border rounded-lg outline-none focus:ring-2 focus:ring-foreground/20 focus:border-foreground transition resize-none leading-relaxed"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium">Attachments</label>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="text-sm text-foreground hover:opacity-70 transition flex items-center gap-1.5"
                >
                  <Paperclip size={14} /> Attach PDF
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf"
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>
              {attachments.length > 0 && (
                <div className="space-y-2">
                  {attachments.map((file, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between px-3 py-2 bg-black/[.02] border border-border rounded-lg text-sm"
                    >
                      <span className="truncate">{file.name}</span>
                      <button
                        onClick={() => removeAttachment(i)}
                        className="ml-2 p-1 hover:bg-red-50 hover:text-red-600 rounded transition"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="border-t border-border p-4 flex gap-3">
            <button
              onClick={sendEmail}
              disabled={sending || !to.trim() || !subject.trim() || !body.trim()}
              className="flex-1 flex items-center justify-center gap-2 px-5 py-3 bg-foreground text-background rounded-lg text-sm font-medium hover:opacity-90 transition disabled:opacity-40 shadow-sm"
            >
              <Send size={16} />
              {sending ? "Sending..." : "Send Email"}
            </button>
            <button
              onClick={saveDraft}
              disabled={saving || !to.trim() || !subject.trim()}
              className="px-5 py-3 border border-border rounded-lg text-sm font-medium hover:bg-black/[.04] transition disabled:opacity-40 flex items-center gap-2"
              title="Save Draft"
            >
              <Save size={16} /> Save
            </button>
          </div>
        </div>

        {/* RIGHT: AI Assistant */}
        <div className="w-1/2 flex flex-col bg-white border border-border rounded-xl shadow-sm">
          <div className="px-6 py-4 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-foreground flex items-center justify-center">
                <Bot size={20} className="text-background" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">AI Email Assistant</h2>
                <p className="text-xs text-muted">Ask me to draft an email for you</p>
              </div>
            </div>
          </div>

          <div
            ref={aiScrollRef}
            className="flex-1 overflow-y-auto p-6 space-y-4"
          >
            {aiMessages.map((m, i) => (
              <div
                key={i}
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
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

          <div className="border-t border-border p-4">
            <div className="flex gap-3">
              <textarea
                value={aiInput}
                onChange={(e) => setAiInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendAiMessage();
                  }
                }}
                rows={3}
                placeholder="E.g., Draft a renewal reminder for Rahul Sharma's LIC policy"
                className="flex-1 resize-none rounded-lg border border-border bg-background px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-foreground/20 focus:border-foreground transition"
              />
              <button
                onClick={sendAiMessage}
                disabled={aiLoading || !aiInput.trim()}
                className="h-full px-5 shrink-0 rounded-lg bg-foreground text-background flex items-center justify-center gap-2 hover:opacity-90 transition disabled:opacity-40 shadow-sm font-medium text-sm"
                aria-label="Send"
              >
                <Send size={16} />
                Ask AI
              </button>
            </div>
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
