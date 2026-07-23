"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

/**
 * Used on the "waiting for approval" page. Polls /api/access every few seconds
 * and, the moment the admin approves this user (access no longer revoked),
 * sends them straight to the dashboard — no manual page reload needed.
 */
export function ApprovalWatcher() {
  const router = useRouter();
  const done = useRef(false);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      if (done.current) return;
      try {
        const res = await fetch(`/api/access?t=${Date.now()}`, {
          cache: "no-store",
        });
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && !done.current && data.revoked === false) {
          done.current = true;
          router.replace("/dashboard");
          router.refresh();
        }
      } catch {
        /* transient network error — keep polling */
      }
    }

    poll();
    const interval = setInterval(poll, 3000);
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

  return null;
}
