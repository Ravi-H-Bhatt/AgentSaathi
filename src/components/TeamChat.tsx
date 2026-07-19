"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Send, MessageSquare, ChevronLeft, Loader2 } from "lucide-react";
import type { ChatMessage } from "@/app/api/chat/route";
import type { ChatContact } from "@/app/api/chat/contacts/route";

export function TeamChat({ currentUserId }: { currentUserId: string }) {
  const [contacts, setContacts] = useState<ChatContact[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(true);
  const [active, setActive] = useState<ChatContact | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastSeenRef = useRef<string | null>(null);

  // Load the list of people I can message.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/chat/contacts");
        const data = await res.json();
        if (!cancelled) setContacts(data.contacts || []);
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) setLoadingContacts(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const load = useCallback(async () => {
    if (!active) return;
    try {
      const base = `/api/chat?with=${encodeURIComponent(active.id)}`;
      const url = lastSeenRef.current
        ? `${base}&since=${encodeURIComponent(lastSeenRef.current)}`
        : base;
      const res = await fetch(url);
      const data = await res.json();
      const incoming: ChatMessage[] = data.messages || [];
      if (incoming.length > 0) {
        lastSeenRef.current = incoming[incoming.length - 1].created_at;
        setMessages((prev) => {
          const existing = new Set(prev.map((m) => m.id));
          return [...prev, ...incoming.filter((m) => !existing.has(m.id))];
        });
      }
    } catch {
      /* ignore */
    }
  }, [active]);

  // Load + poll the active thread every 5s.
  useEffect(() => {
    if (!active) return;
    setMessages([]);
    lastSeenRef.current = null;
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [active, load]);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  async function send() {
    const text = input.trim();
    if (!text || sending || !active) return;
    setInput("");
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: text, recipientId: active.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      if (data.message) {
        const m: ChatMessage = data.message;
        lastSeenRef.current = m.created_at;
        setMessages((prev) => {
          const existing = new Set(prev.map((x) => x.id));
          return existing.has(m.id) ? prev : [...prev, m];
        });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to send");
    } finally {
      setSending(false);
    }
  }

  function initials(name: string | null): string {
    if (!name) return "?";
    return name
      .split(" ")
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }

  function fmtTime(iso: string) {
    return new Date(iso).toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  // ---- Contacts list view ----
  if (!active) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 overflow-y-auto px-2 py-2 min-h-0">
          {loadingContacts ? (
            <div className="flex items-center justify-center h-full text-muted">
              <Loader2 size={20} className="animate-spin" />
            </div>
          ) : contacts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center text-muted py-12">
              <MessageSquare size={32} className="mb-3 opacity-30" />
              <p className="text-sm">No one to message yet.</p>
            </div>
          ) : (
            <ul className="space-y-1">
              {contacts.map((c) => (
                <li key={c.id}>
                  <button
                    onClick={() => setActive(c)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-black/[.04] transition text-left"
                  >
                    <div className="h-9 w-9 rounded-full bg-foreground text-background flex items-center justify-center text-xs font-semibold shrink-0">
                      {initials(c.name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{c.name}</p>
                      <p className="text-xs text-muted capitalize">{c.role}</p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    );
  }

  // ---- Direct message thread view ----
  return (
    <div className="flex flex-col h-full">
      {/* Thread header with back to contacts */}
      <div className="flex items-center gap-2 px-2 py-2 border-b border-border">
        <button
          onClick={() => setActive(null)}
          className="p-1.5 rounded-lg hover:bg-black/[.04]"
          aria-label="Back to contacts"
        >
          <ChevronLeft size={18} />
        </button>
        <div className="h-8 w-8 rounded-full bg-foreground text-background flex items-center justify-center text-xs font-semibold">
          {initials(active.name)}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">{active.name}</p>
          <p className="text-xs text-muted capitalize">{active.role}</p>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3 min-h-0">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center text-muted py-12">
            <MessageSquare size={32} className="mb-3 opacity-30" />
            <p className="text-sm">No messages yet.</p>
            <p className="text-xs mt-1">Say hello to {active.name}.</p>
          </div>
        )}
        {messages.map((m) => {
          const mine = m.sender_id === currentUserId;
          return (
            <div key={m.id} className={`flex gap-2.5 ${mine ? "flex-row-reverse" : ""}`}>
              {!mine && (
                <div className="h-7 w-7 rounded-full bg-foreground text-background flex items-center justify-center text-xs font-semibold shrink-0 mt-1">
                  {initials(m.sender_name)}
                </div>
              )}
              <div className={`max-w-[78%] ${mine ? "items-end" : "items-start"} flex flex-col gap-0.5`}>
                <div
                  className={`rounded-2xl px-3.5 py-2 text-sm leading-relaxed break-words ${
                    mine
                      ? "bg-foreground text-background rounded-tr-sm"
                      : "bg-black/[.05] text-foreground rounded-tl-sm"
                  }`}
                >
                  {m.content}
                </div>
                <span className="text-xs text-muted px-1">{fmtTime(m.created_at)}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Input */}
      {error && <p className="px-4 py-1 text-xs text-red-600">{error}</p>}
      <div className="border-t border-border p-3">
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            rows={1}
            placeholder={`Message ${active.name}…`}
            className="flex-1 resize-none rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-foreground/10 max-h-28"
            style={{ minHeight: "40px" }}
          />
          <button
            onClick={send}
            disabled={sending || !input.trim()}
            className="h-10 w-10 shrink-0 rounded-xl bg-foreground text-background flex items-center justify-center hover:opacity-90 transition disabled:opacity-40"
            aria-label="Send"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
