"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { Flag, X } from "lucide-react";

export function ReportIssue() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function submit() {
    if (!message.trim() || sending) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: message.trim(), page: pathname }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send");
      setDone(true);
      setMessage("");
      setTimeout(() => {
        setOpen(false);
        setDone(false);
      }, 1500);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to send");
    } finally {
      setSending(false);
    }
  }

  const trigger = (
    <button
      onClick={() => setOpen(true)}
      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-muted hover:bg-black/[.04] hover:text-foreground transition"
    >
      <Flag size={16} />
      Report an issue
    </button>
  );

  const modal =
    open && mounted
      ? createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          >
            <div
              className="bg-card rounded-2xl shadow-2xl w-full max-w-md border border-border overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <h3 className="font-semibold flex items-center gap-2">
                  <Flag size={16} /> Report an issue
                </h3>
                <button
                  onClick={() => setOpen(false)}
                  className="p-1.5 hover:bg-black/[.06] rounded-lg transition"
                  aria-label="Close"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="p-5 space-y-3">
                {done ? (
                  <p className="text-sm text-green-600 py-6 text-center">
                    Thank you! Your report has been sent to the admin.
                  </p>
                ) : (
                  <>
                    {error && (
                      <div className="text-sm bg-red-50 text-red-600 px-3 py-2 rounded-lg">
                        {error}
                      </div>
                    )}
                    <p className="text-xs text-muted">
                      Describe the problem you faced. The admin will see it with your name and
                      the current page.
                    </p>
                    <textarea
                      autoFocus
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      rows={5}
                      placeholder="e.g. PDF upload failed for client register…"
                      className="w-full px-3 py-2.5 text-sm border border-border rounded-lg outline-none focus:ring-2 focus:ring-foreground/10 focus:border-foreground transition resize-none"
                    />
                    <button
                      onClick={submit}
                      disabled={sending || !message.trim()}
                      className="w-full px-4 py-2.5 bg-foreground text-background rounded-lg text-sm font-medium hover:opacity-90 transition disabled:opacity-40"
                    >
                      {sending ? "Sending…" : "Send report"}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <>
      {trigger}
      {modal}
    </>
  );
}
