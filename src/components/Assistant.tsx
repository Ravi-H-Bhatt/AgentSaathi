"use client";

import { useRef, useState } from "react";
import { Send } from "lucide-react";

interface Msg {
  role: "user" | "assistant";
  content: string;
}

export function Assistant() {
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "assistant",
      content:
        "Hi! Ask me about your clients and policies — for example, “What policies does Rahul Sharma have?” or “Whose renewals are coming up?” I only answer from your own data.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  async function send() {
    const q = input.trim();
    if (!q || loading) return;
    const next = [...messages, { role: "user" as const, content: q }];
    setMessages(next);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: q,
          history: messages.slice(1).map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });
      const data = await res.json();
      setMessages([
        ...next,
        {
          role: "assistant",
          content: data.answer || "Sorry, something went wrong.",
        },
      ]);
    } catch {
      setMessages([
        ...next,
        { role: "assistant", content: "Network error. Please try again." },
      ]);
    } finally {
      setLoading(false);
      requestAnimationFrame(() => {
        scrollRef.current?.scrollTo({
          top: scrollRef.current.scrollHeight,
          behavior: "smooth",
        });
      });
    }
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-4">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                m.role === "user"
                  ? "bg-foreground text-background"
                  : "bg-black/[.04] text-foreground"
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-black/[.04] rounded-2xl px-4 py-3">
              <span className="inline-flex gap-1">
                <Dot /> <Dot delay="0.15s" /> <Dot delay="0.3s" />
              </span>
            </div>
          </div>
        )}
      </div>
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
            placeholder="Ask about a client…"
            className="flex-1 resize-none rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-foreground/10 max-h-32"
          />
          <button
            onClick={send}
            disabled={loading || !input.trim()}
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

function Dot({ delay = "0s" }: { delay?: string }) {
  return (
    <span
      className="h-1.5 w-1.5 rounded-full bg-muted animate-bounce inline-block"
      style={{ animationDelay: delay }}
    />
  );
}
