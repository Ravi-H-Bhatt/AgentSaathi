"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Users, BarChart3, LogOut, Flag, Activity, MessageSquare, X } from "lucide-react";
import { Logo } from "@/components/Logo";
import { NotificationToggle } from "@/components/NotificationToggle";
import { TeamChat } from "@/components/TeamChat";

const nav = [
  { href: "/admin", label: "Agents", icon: Users },
  { href: "/admin/premiums", label: "Premium charts", icon: BarChart3 },
  { href: "/admin/reports", label: "Issue reports", icon: Flag },
  { href: "/admin/activity", label: "Activity logs", icon: Activity },
];

export function AdminShell({
  children,
  agentEmail,
  agentId,
}: {
  children: React.ReactNode;
  agentEmail: string;
  agentId: string;
}) {
  const pathname = usePathname();
  const [chatOpen, setChatOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col">
      <header className="min-h-16 pt-[env(safe-area-inset-top)] border-b border-border bg-card sticky top-0 z-30">
        <div className="min-h-16 px-4 lg:px-8 flex items-center justify-between max-w-6xl mx-auto w-full">
          <div className="flex items-center gap-8">
            <Logo />
            <span className="text-xs font-semibold uppercase tracking-wide bg-foreground text-background px-2 py-1 rounded-full">
              Admin
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted hidden sm:block">
              {agentEmail}
            </span>
            <button
              onClick={() => setChatOpen(true)}
              className="inline-flex items-center gap-2 text-sm font-medium px-3 py-2 rounded-full border border-border hover:bg-black/[.03] transition"
              title="Message an agent or colleague"
            >
              <MessageSquare size={15} />
              <span className="hidden sm:inline">Chat</span>
            </button>
            <form action="/auth/signout" method="post">
              <button className="inline-flex items-center gap-2 text-sm font-medium px-3 py-2 rounded-full border border-border hover:bg-black/[.03] transition">
                <LogOut size={15} /> <span className="hidden sm:inline">Sign out</span>
              </button>
            </form>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto w-full px-4 lg:px-8 py-6 flex-1">
        <nav className="flex gap-2 mb-6">
          {nav.map((item) => {
            const active =
              item.href === "/admin"
                ? pathname === "/admin"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition ${
                  active
                    ? "bg-foreground text-background"
                    : "border border-border hover:bg-black/[.03]"
                }`}
              >
                <item.icon size={16} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Admins enable push here so they receive alerts when an agent or
            colleague submits a new issue report. */}
        <div className="mb-6 flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-2 flex-wrap">
          <span className="text-sm text-muted">
            Turn on push to get alerted when someone reports an issue.
          </span>
          <div className="w-56 max-w-full">
            <NotificationToggle />
          </div>
        </div>

        {children}
      </div>

      {/* Direct-message drawer: admin can DM any agent or colleague. */}
      {chatOpen && (
        <>
          <div
            onClick={() => setChatOpen(false)}
            className="fixed inset-0 bg-black/30 z-50"
          />
          <div className="fixed right-0 top-0 bottom-0 z-50 w-full sm:w-[400px] bg-card border-l border-border flex flex-col shadow-xl">
            <div className="min-h-16 pt-[env(safe-area-inset-top)] px-4 flex items-center justify-between border-b border-border">
              <h2 className="font-semibold flex items-center gap-2">
                <MessageSquare size={18} /> Messages
              </h2>
              <button
                onClick={() => setChatOpen(false)}
                className="p-1.5 rounded-lg hover:bg-black/[.04]"
                aria-label="Close chat"
              >
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 min-h-0">
              <TeamChat currentUserId={agentId} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
