"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Send, MessageSquare } from "lucide-react";
import type { ChatMessage } from "@/app/api/chat/route";

export function TeamChat({ currentUserId }: { currentUserId: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastSeenRef = useRef<string | null>(null);

  const load = useCallback(async () => {
    try {
      const url =
        lastSeenRef.current
          ? `/api/chat?since=${encodeURIComponent(lastSeenRef.current)}`
          : "/api/chat";
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
    } catch { /* ignore */ }
  }, []);

  // Initial load + polling every 5s
  useEffect(() => {
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [load]);

  // Scroll to bottom on new messages
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  async function send() {
    const text = input.trim();
    if (!text || sending) return;
    setInput("");
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: text }),
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

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3 min-h-0">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center text-muted py-12">
            <MessageSquare size={32} className="mb-3 opacity-30" />
            <p className="text-sm">No messages yet.</p>
            <p className="text-xs mt-1">Start the conversation with your team.</p>
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
                {!mine && (
                  <span className="text-xs text-muted px-1">{m.sender_name || "Unknown"}</span>
                )}
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
            placeholder="Message your team…"
            className="flex-1 resize-none rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-foreground/10 max-h-28"
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
