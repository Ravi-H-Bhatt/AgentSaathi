"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Wrench } from "lucide-react";

/**
 * Full-screen "Work in Progress" overlay shown to agents/colleagues while
 * the admin has maintenance mode ON. It polls every few seconds and, once
 * the admin turns it OFF, automatically refreshes back into the app.
 */
export function MaintenanceScreen({ message }: { message: string | null }) {
  const router = useRouter();
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const res = await fetch("/api/maintenance", { cache: "no-store" });
        const data = await res.json();
        if (!cancelled && !data.active) {
          // Admin turned it off → reload back into the app.
          router.refresh();
          window.location.reload();
        }
      } catch {
        /* ignore transient errors, keep polling */
      }
    }

    const interval = setInterval(poll, 4000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [router]);

  async function checkNow() {
    setChecking(true);
    try {
      const res = await fetch("/api/maintenance", { cache: "no-store" });
      const data = await res.json();
      if (!data.active) {
        router.refresh();
        window.location.reload();
        return;
      }
    } catch {
      /* ignore */
    }
    setTimeout(() => setChecking(false), 800);
  }

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black text-white px-6 text-center overflow-hidden">
      {/* Soft animated background glow */}
      <motion.div
        aria-hidden
        className="absolute h-[520px] w-[520px] rounded-full bg-white/[.06] blur-3xl"
        animate={{ scale: [1, 1.15, 1], opacity: [0.4, 0.7, 0.4] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Spinning wrench badge */}
      <motion.div
        className="relative mb-8 flex h-20 w-20 items-center justify-center rounded-2xl bg-white text-black"
        animate={{ rotate: [0, -12, 12, -12, 0] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
      >
        <Wrench size={36} />
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative text-3xl font-bold tracking-tight sm:text-4xl"
      >
        Work in progress
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="relative mt-4 max-w-md text-sm text-white/70 sm:text-base"
      >
        {message?.trim()
          ? message
          : "We're making some improvements right now. The app will be back in a moment — hang tight."}
      </motion.p>

      {/* Animated dots */}
      <div className="relative mt-8 flex items-center gap-2">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="h-2.5 w-2.5 rounded-full bg-white"
            animate={{ opacity: [0.3, 1, 0.3], y: [0, -4, 0] }}
            transition={{
              duration: 1.2,
              repeat: Infinity,
              delay: i * 0.2,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>

      <button
        onClick={checkNow}
        disabled={checking}
        className="relative mt-10 rounded-full border border-white/25 px-5 py-2.5 text-sm font-medium text-white/90 transition hover:bg-white hover:text-black disabled:opacity-50"
      >
        {checking ? "Checking…" : "Check again"}
      </button>

      <p className="relative mt-6 text-xs text-white/40">
        This page updates automatically.
      </p>
    </div>
  );
}
