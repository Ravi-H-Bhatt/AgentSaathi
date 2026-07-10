"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Trash2, Mail, Sparkles } from "lucide-react";

interface Msg {
  role: "user" | "assistant";
  content: string;
  // Optional email draft attached to an assistant message → shows an action button.
  email?: { to?: string; cc?: string; subject: string; body: string };
}

const WELCOME: Msg = {
  role: "assistant",
  content:
    "Namaste! 🙏 I'm your AgentSaathi assistant.\n\nI can help you with:\n\n📋 Client & policy details\n📧 Drafting emails\n💰 Premiums, renewals & totals\n📈 Insurance, mutual funds & finance (India)\n\nWhat can I help you with today? 😊",
};

// Quick-start suggestion chips shown before the first user message.
const SUGGESTIONS = [
  "📈 Best term insurance plans in India",
  "💡 Explain ULIP vs term plan",
  "📊 How much cover does a family need?",
  "🧮 Calculate GST on ₹15,000 premium",
];

// Heuristic: does the user want to draft/write/compose an email?
function isEmailIntent(q: string): boolean {
  return /\b(draft|write|compose|send|prepare)\b.*\b(email|mail|reminder|letter)\b/i.test(q)
    || /\b(email|mail)\b.*\b(draft|reminder|to)\b/i.test(q);
}

export function Assistant() {
  const router = useRouter();
  const [messages, setMessages] = useState<Msg[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  function clearChat() {
    if (loading) return;
    setMessages([WELCOME]);
    setInput("");
  }

  function scrollToBottom() {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    });
  }

  // Keep the view pinned to the latest message.
  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  function openInComposer(email: NonNullable<Msg["email"]>) {
    try {
      sessionStorage.setItem("agentsaathi_email_prefill", JSON.stringify(email));
    } catch {
      // ignore storage errors
    }
    router.push("/email");
  }

  async function send(preset?: string) {
    const q = (preset ?? input).trim();
    if (!q || loading) return;
    const next = [...messages, { role: "user" as const, content: q }];
    setMessages(next);
    setInput("");
    setLoading(true);
    scrollToBottom();

    const history = messages
      .slice(1)
      .map((m) => ({ role: m.role, content: m.content }));

    try {
      if (isEmailIntent(q)) {
        // Route to the email-drafting model so we can offer a "Compose" action.
        const res = await fetch("/api/email/ai-draft", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ question: q, history }),
        });
        const data = await res.json();
        setMessages([
          ...next,
          {
            role: "assistant",
            content:
              data.answer ||
              (data.email
                ? "I've drafted an email for you. Open it in the composer to review and send."
                : "I can help draft that. Which client and policy is it for?"),
            email: data.email,
          },
        ]);
      } else {
        const res = await fetch("/api/assistant", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ question: q, history }),
        });
        const data = await res.json();
        setMessages([
          ...next,
          {
            role: "assistant",
            content: data.answer || "Sorry, I couldn't generate a response. Please try again.",
          },
        ]);
      }
    } catch {
      setMessages([
        ...next,
        { role: "assistant", content: "Network error. Please try again." },
      ]);
    } finally {
      setLoading(false);
      scrollToBottom();
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
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div className={`max-w-[85%] flex flex-col gap-2 ${m.role === "user" ? "items-end" : "items-start"}`}>
              <div
                className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                  m.role === "user"
                    ? "bg-foreground text-background rounded-br-md"
                    : "bg-black/[.04] text-foreground rounded-bl-md"
                }`}
              >
                {m.content}
              </div>
              {m.email && (
                <button
                  onClick={() => openInComposer(m.email!)}
                  className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg bg-foreground text-background hover:opacity-90 hover:scale-105 active:scale-95 transition-all"
                >
                  <Mail size={13} /> Open in Compose Email
                </button>
              )}
            </div>
          </motion.div>
        ))}

        {/* Quick-start suggestion chips (only before the first question) */}
        <AnimatePresence>
          {messages.length === 1 && !loading && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ delay: 0.2 }}
              className="flex flex-wrap gap-2 pt-1"
            >
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s.replace(/^[^\s]+\s/, ""))}
                  className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-full border border-border bg-card hover:bg-black/[.04] hover:border-foreground/30 hover:scale-105 active:scale-95 transition-all"
                >
                  {s}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {loading && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-start"
          >
            <div className="bg-black/[.04] rounded-2xl rounded-bl-md px-4 py-3 inline-flex items-center gap-2">
              <Sparkles size={14} className="text-muted animate-pulse" />
              <span className="inline-flex gap-1">
                <Dot /> <Dot delay="0.15s" /> <Dot delay="0.3s" />
              </span>
            </div>
          </motion.div>
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
            onClick={() => send()}
            disabled={loading || !input.trim()}
            className="h-10 w-10 shrink-0 rounded-xl bg-foreground text-background flex items-center justify-center hover:opacity-90 hover:scale-105 active:scale-95 transition-all disabled:opacity-40 disabled:hover:scale-100"
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
