"use client";

import { useRef, useState } from "react";
import { Send, Trash2 } from "lucide-react";

interface Msg {
  role: "user" | "assistant";
  content: string;
}

const WELCOME: Msg = {
  role: "assistant",
  content:
    "Namaste! I'm your AgentSaathi assistant. Ask me about your clients, policies, draft emails, or general insurance and finance questions in India.",
};

export function Assistant() {
  const [messages, setMessages] = useState<Msg[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  function clearChat() {
    if (loading) return;
    setMessages([WELCOME]);
    setInput("");
  }

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
      
      // Check for errors or malformed responses
      let answer = data.answer || "";
      
      // If response contains tool call syntax or technical errors, show friendly message
      if (!answer || answer.includes("web_search") || answer.includes("tool_call") || answer.includes("function") || answer.length < 10) {
        answer = "I'm having trouble processing that request right now. Please try again in a moment.";
      }
      
      // Check for other error patterns
      if (answer.toLowerCase().includes("error") || answer.toLowerCase().includes("failed")) {
        answer = "I'm experiencing some technical difficulties. Please try again shortly.";
      }
      
      setMessages([
        ...next,
        {
          role: "assistant",
          content: answer,
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
      <div className="flex items-center justify-end px-4 py-2 border-b border-border">
        <button
          onClick={clearChat}
          disabled={loading || messages.length <= 1}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted hover:text-foreground px-2.5 py-1.5 rounded-lg hover:bg-black/[.04] transition disabled:opacity-40"
        >
          <Trash2 size={14} /> Clear chat
        </button>
      </div>
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
