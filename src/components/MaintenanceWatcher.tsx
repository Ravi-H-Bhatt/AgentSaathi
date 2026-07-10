"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { MaintenanceScreen } from "@/components/MaintenanceScreen";

/**
 * Polls the maintenance endpoint every 2 seconds and shows/hides the
 * full-screen "Work in Progress" overlay LIVE — no page refresh needed in
 * either direction. Initial state comes from the server to avoid any flash
 * on cold load (important for the installed PWA).
 */
export function MaintenanceWatcher({
  initialActive,
  initialMessage,
}: {
  initialActive: boolean;
  initialMessage: string | null;
}) {
  const router = useRouter();
  const [active, setActive] = useState(initialActive);
  const [message, setMessage] = useState<string | null>(initialMessage);
  const wasActive = useRef(initialActive);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        // Cache-bust so the installed PWA / service worker never serves a
        // stale response.
        const res = await fetch(`/api/maintenance?t=${Date.now()}`, {
          cache: "no-store",
        });
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;

        // Show/hide the overlay live — happens automatically, no user action.
        setActive(!!data.active);
        setMessage(data.message ?? null);

        // When maintenance switches OFF, silently re-fetch server data
        // (no full page reload / no flash) so fresh data shows automatically.
        if (wasActive.current && !data.active) {
          router.refresh();
        }
        wasActive.current = !!data.active;
      } catch {
        /* transient network error — keep polling */
      }
    }

    poll(); // immediate check
    const interval = setInterval(poll, 2000);

    // Re-check instantly when the tab/PWA regains focus.
    const onFocus = () => poll();
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);

    return () => {
      cancelled = true;
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [router]);

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          key="maintenance"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <MaintenanceScreen message={message} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
