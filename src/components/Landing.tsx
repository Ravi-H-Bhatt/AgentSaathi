"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  FileText,
  Search,
  CalendarClock,
  Bot,
  Mail,
  TrendingUp,
} from "lucide-react";

const features = [
  {
    icon: FileText,
    title: "PDF extraction",
    body: "Upload policy documents and let AI pull out company, policy number, sum insured, premium and renewal dates — with a review step before saving.",
  },
  {
    icon: Search,
    title: "Client directory",
    body: "Every client, alphabetized and instantly searchable by name or policy number.",
  },
  {
    icon: CalendarClock,
    title: "Renewal dashboard",
    body: "See exactly which policies renew this month so nothing slips through.",
  },
  {
    icon: Bot,
    title: "Grounded AI assistant",
    body: "Ask about any client. Answers come strictly from your own data — never made up.",
  },
  {
    icon: Mail,
    title: "Automated reminders",
    body: "Send professional renewal emails to clients in one click.",
  },
  {
    icon: TrendingUp,
    title: "Premium projections",
    body: "Get alerted when a client's premium will change with age, ahead of time.",
  },
];

export function Landing() {
  return (
    <main className="flex-1">
      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 pt-24 pb-20 text-center">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <span className="inline-block text-xs font-medium tracking-wide uppercase text-muted border border-border rounded-full px-3 py-1 mb-6">
            Insurance agent workspace
          </span>
          <h1 className="text-4xl sm:text-6xl font-bold tracking-tight leading-[1.05] max-w-3xl mx-auto">
            Every client, every policy,
            <br />
            <span className="text-muted">in one calm place.</span>
          </h1>
          <p className="mt-6 text-lg text-muted max-w-xl mx-auto leading-relaxed">
            AgentSaathi turns scattered policy PDFs into a searchable book of
            business — with renewal tracking, premium projections, and an AI
            assistant grounded in your own data.
          </p>
          <div className="mt-9 flex items-center justify-center gap-3">
            <Link
              href="/login"
              className="px-6 py-3 rounded-full bg-foreground text-background font-medium hover:opacity-90 transition"
            >
              Get started
            </Link>
            <a
              href="#features"
              className="px-6 py-3 rounded-full border border-border font-medium hover:bg-black/[.03] transition"
            >
              See features
            </a>
          </div>
        </motion.div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-6xl px-6 pb-24">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5, delay: i * 0.05 }}
              className="rounded-2xl border border-border bg-card p-6 hover:shadow-sm transition"
            >
              <div className="h-10 w-10 rounded-xl bg-foreground text-background flex items-center justify-center mb-4">
                <f.icon size={18} />
              </div>
              <h3 className="font-semibold mb-1.5">{f.title}</h3>
              <p className="text-sm text-muted leading-relaxed">{f.body}</p>
            </motion.div>
          ))}
        </div>
      </section>
    </main>
  );
}
