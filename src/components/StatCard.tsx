"use client";

import { useEffect, useRef, useState } from "react";
import {
  animate,
  motion,
  useInView,
  useMotionValue,
  useTransform,
} from "framer-motion";

/**
 * Animated stat tile. If `value` is purely numeric (optionally with a ₹ prefix
 * and grouping commas), the number counts up when scrolled into view.
 */
export function StatCard({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });

  // Try to parse a leading ₹ and a number for the count-up effect.
  const match = value.match(/^(₹)?\s*([\d,]+(?:\.\d+)?)$/);
  const isNumeric = !!match;
  const prefix = match?.[1] ?? "";
  const target = isNumeric ? Number(match![2].replace(/,/g, "")) : 0;

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 16 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -4 }}
      className={`group relative overflow-hidden rounded-2xl border p-5 lift sheen ${
        highlight
          ? "bg-foreground text-background border-foreground"
          : "bg-card border-border"
      }`}
    >
      <p
        className={`text-sm ${highlight ? "text-background/70" : "text-muted"}`}
      >
        {label}
      </p>
      <p className="text-2xl font-bold tracking-tight mt-1">
        {isNumeric ? (
          <CountUp to={target} prefix={prefix} start={inView} />
        ) : (
          value
        )}
      </p>
    </motion.div>
  );
}

function CountUp({
  to,
  prefix,
  start,
}: {
  to: number;
  prefix: string;
  start: boolean;
}) {
  const count = useMotionValue(0);
  const rounded = useTransform(count, (v) =>
    prefix
      ? prefix + Math.round(v).toLocaleString("en-IN")
      : Math.round(v).toLocaleString("en-IN")
  );
  const [text, setText] = useState(prefix ? prefix + "0" : "0");

  useEffect(() => {
    if (!start) return;
    const controls = animate(count, to, {
      duration: 1,
      ease: [0.22, 1, 0.36, 1],
    });
    const unsub = rounded.on("change", (v) => setText(v));
    return () => {
      controls.stop();
      unsub();
    };
  }, [start, to, count, rounded]);

  return <span>{text}</span>;
}
