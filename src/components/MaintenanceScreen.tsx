"use client";

import { motion } from "framer-motion";
import { Wrench } from "lucide-react";

/**
 * Full-screen "Work in Progress" overlay (presentational only).
 * Visibility is controlled by <MaintenanceWatcher/>, which polls every 2s.
 */
export function MaintenanceScreen({ message }: { message?: string | null }) {
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

      <p className="relative mt-10 text-xs text-white/40">
        This screen updates automatically — no need to refresh.
      </p>
    </div>
  );
}
