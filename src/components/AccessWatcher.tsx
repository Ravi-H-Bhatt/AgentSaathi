"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ShieldAlert, LogOut } from "lucide-react";

/**
 * Polls /api/access every 2 seconds and, the moment the signed-in user's access
 * is revoked (their own status, or — for a colleague — their parent agent's),
 * shows a blocking full-screen "access revoked" overlay. No manual refresh
 * needed, and it also fires for every colleague of a revoked agent.
 */
export function AccessWatcher() {
  const [revoked, setRevoked] = useState(false);
  const cancelled = useRef(false);

  useEffect(() => {
    cancelled.current = false;

    async function poll() {
      try {
        const res = await fetch(`/api/access?t=${Date.now()}`, {
          cache: "no-store",
        });
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled.current) setRevoked(!!data.revoked);
      } catch {
        /* transient network error — keep polling */
      }
    }

    poll();
    const interval = setInterval(poll, 2000);
    const onFocus = () => poll();
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);

    return () => {
      cancelled.current = true;
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, []);

  return (
    <AnimatePresence>
      {revoked && (
        <motion.div
          key="revoked"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-background/95 backdrop-blur p-6"
        >
          <div className="max-w-md w-full text-center rounded-2xl border border-border bg-card p-8 shadow-xl">
            <div className="mx-auto h-14 w-14 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center">
              <ShieldAlert size={28} />
            </div>
            <h1 className="mt-4 text-xl font-bold tracking-tight">
              Your access has been revoked
            </h1>
            <p className="mt-2 text-sm text-muted">
              An administrator has removed your access to AgentSaathi. Please
              contact your administrator if you think this is a mistake.
            </p>
            <form action="/auth/signout" method="post" className="mt-6">
              <button className="w-full inline-flex items-center justify-center gap-2 text-sm font-medium px-4 py-2.5 rounded-full bg-foreground text-background hover:opacity-90 transition">
                <LogOut size={16} /> Sign out
              </button>
            </form>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
