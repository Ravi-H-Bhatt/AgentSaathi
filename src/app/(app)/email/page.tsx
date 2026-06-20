"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Save, Trash2, Mail, Bot, Paperclip, X, ArrowUp } from "lucide-react";

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

const SUGGESTIONS = [
  { title: "Draft a renewal reminder", sub: "for a client's policy" },
  { title: "Write a follow-up email", sub: "about a pending payment" },
  { title: "Compose a thank-you note", sub: "for a new policy purchase" },
  { title: "Create a birthday wish", sub: "for a valued client" },
];

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

  const [aiMessages, setAiMessages] = useState<AiMessage[]>([]);
  const [aiInput, setAiInput] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const aiScrollRef = useRef<HTMLDivElement>(null);

  const loadDrafts = useCallback(async () => {
    try {
      const res = await fetch("/api/email/drafts");
      const data = await res.json();
      setDrafts(data.drafts || []);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    loadDrafts();
  }, [loadDrafts]);

  // Prefill from the common AI Assistant ("Open in Compose Email").
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("agentsaathi_email_prefill");
      if (raw) {
        const e = JSON.parse(raw);
        if (e.to) setTo(e.to);
        if (e.cc) setCc(e.cc);
        if (e.subject) setSubject(e.subject);
        if (e.body) setBody(e.body);
        sessionStorage.removeItem("agentsaathi_email_prefill");
        setAiMessages([
          {
            role: "assistant",
            content: "I've loaded the email I drafted. Review the form on the left and click Send when ready.",
          },
        ]);
      }
    } catch {
      // ignore
    }
  }, []);

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
      if (data.draft) setSelectedDraft(data.draft);
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
      for (const file of attachments) formData.append("attachments", file);

      const res = await fetch("/api/email/send", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send");
      setSuccess("Email sent successfully!");
      setTimeout(() => setSuccess(null), 3000);
      clearForm();
      if (selectedDraft?.id) {
        await fetch(`/api/email/drafts?id=${selectedDraft.id}`, { method: "DELETE" });
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
      if (selectedDraft?.id === id) clearForm();
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
              "Done! I've filled in the email form on the left. Review it and click Send when ready.",
          },
        ]);
      } else {
        setAiMessages([
          ...next,
          { role: "assistant", content: data.answer || "I'm here to help. Please clarify your request." },
        ]);
      }
    } catch {
      setAiMessages([...next, { role: "assistant", content: "Network error. Please try again." }]);
    } finally {
      setAiLoading(false);
    }
  }

  return (
    <div className="lg:h-[calc(100vh-8rem)] flex flex-col lg:flex-row gap-5 min-h-0">
      {/* LEFT: Email Form */}
      <div className="w-full lg:w-1/2 flex flex-col bg-white border border-border rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between shrink-0">
          <h2 className="text-base font-semibold flex items-center gap-2">
            <Mail size={18} /> Compose Email
          </h2>
          {selectedDraft && (
            <button
              onClick={clearForm}
              className="text-xs text-muted hover:text-foreground px-3 py-1.5 rounded-lg hover:bg-black/[.04] transition"
            >
              New Email
            </button>
          )}
        </div>

        {drafts.length > 0 && (
          <div className="px-6 py-3 border-b border-border bg-black/[.02] shrink-0">
            <p className="text-xs font-medium text-muted mb-2">Saved Drafts</p>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {drafts.map((draft) => (
                <button
                  key={draft.id}
                  onClick={() => loadDraft(draft)}
                  className={`shrink-0 px-3 py-1.5 rounded-lg text-xs border transition max-w-[160px] truncate ${
                    selectedDraft?.id === draft.id
                      ? "border-foreground bg-foreground text-background"
                      : "border-border bg-white hover:border-foreground/30"
                  }`}
                  title={draft.subject}
                >
                  {draft.subject || "(no subject)"}
                </button>
              ))}
            </div>
          </div>
        )}

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

          <div>
            <label className="block text-sm font-medium mb-2">To *</label>
            <input
              type="email"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="recipient@example.com"
              className="w-full px-4 py-2.5 text-sm border border-border rounded-lg outline-none focus:ring-2 focus:ring-foreground/20 focus:border-foreground transition"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">CC</label>
            <input
              type="email"
              value={cc}
              onChange={(e) => setCc(e.target.value)}
              placeholder="cc@example.com (optional)"
              className="w-full px-4 py-2.5 text-sm border border-border rounded-lg outline-none focus:ring-2 focus:ring-foreground/20 focus:border-foreground transition"
            />
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
              placeholder="Write your message here..."
              rows={10}
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
                    <span className="truncate flex items-center gap-2">
                      <Paperclip size={13} /> {file.name}
                    </span>
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

        <div className="border-t border-border p-4 flex gap-3 shrink-0">
          <button
            onClick={sendEmail}
            disabled={sending || !to.trim() || !subject.trim() || !body.trim()}
            className="flex-1 flex items-center justify-center gap-2 px-5 py-3 bg-foreground text-background rounded-lg text-sm font-medium hover:opacity-90 transition disabled:opacity-40 shadow-sm"
          >
            <ArrowUp size={16} className="rotate-45" />
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
      <div className="w-full lg:w-1/2 flex flex-col bg-white border border-border rounded-2xl shadow-sm overflow-hidden min-h-[60vh] lg:min-h-0">
        <div className="px-6 py-4 border-b border-border flex items-center gap-3 shrink-0">
          <div className="h-10 w-10 rounded-full bg-foreground flex items-center justify-center">
            <Bot size={20} className="text-background" />
          </div>
          <div>
            <h2 className="text-base font-semibold">AI Email Assistant</h2>
            <p className="text-xs text-muted">Ask me to draft an email for you</p>
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
                <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
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

        {/* AI Input — embedded send button, stays aligned */}
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
              placeholder="E.g., Draft a renewal reminder for Rahul Sharma's LIC policy"
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
