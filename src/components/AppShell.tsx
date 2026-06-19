"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Users,
  Upload,
  Bot,
  Menu,
  X,
  LogOut,
} from "lucide-react";
import { Logo } from "@/components/Logo";
import { Assistant } from "@/components/Assistant";

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/clients", label: "Clients", icon: Users },
  { href: "/upload", label: "Upload policy", icon: Upload },
];

export function AppShell({
  children,
  agentName,
  agentEmail,
  avatarUrl,
}: {
  children: React.ReactNode;
  agentName: string;
  agentEmail: string;
  avatarUrl: string | null;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);

  const SidebarContent = (
    <div className="flex flex-col h-full">
      <div className="h-16 flex items-center px-5 border-b border-border">
        <Logo />
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {nav.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${
                active
                  ? "bg-foreground text-background"
                  : "text-muted hover:bg-black/[.04] hover:text-foreground"
              }`}
            >
              <item.icon size={18} />
              {item.label}
            </Link>
          );
        })}
        <button
          onClick={() => {
            setAssistantOpen(true);
            setMobileOpen(false);
          }}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted hover:bg-black/[.04] hover:text-foreground transition"
        >
          <Bot size={18} />
          AI Assistant
        </button>
      </nav>
      <div className="p-3 border-t border-border">
        <div className="flex items-center gap-3 px-2 py-2">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarUrl}
              alt=""
              className="h-8 w-8 rounded-full object-cover"
            />
          ) : (
            <div className="h-8 w-8 rounded-full bg-foreground text-background flex items-center justify-center text-xs font-semibold">
              {agentName.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium truncate">{agentName}</p>
            <p className="text-xs text-muted truncate">{agentEmail}</p>
          </div>
        </div>
        <form action="/auth/signout" method="post" className="mt-1">
          <button className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-muted hover:bg-black/[.04] hover:text-foreground transition">
            <LogOut size={16} />
            Sign out
          </button>
        </form>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-64 shrink-0 border-r border-border bg-card flex-col fixed inset-y-0">
        {SidebarContent}
      </aside>

      {/* Mobile sidebar */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              className="fixed inset-0 bg-black/30 z-40 lg:hidden"
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: "tween", duration: 0.25 }}
              className="fixed inset-y-0 left-0 w-64 bg-card border-r border-border z-50 lg:hidden"
            >
              {SidebarContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main */}
      <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
        <header className="h-16 border-b border-border bg-background/80 backdrop-blur sticky top-0 z-30 flex items-center justify-between px-4 lg:px-8">
          <button
            onClick={() => setMobileOpen(true)}
            className="lg:hidden p-2 -ml-2 rounded-lg hover:bg-black/[.04]"
            aria-label="Open menu"
          >
            <Menu size={20} />
          </button>
          <div className="lg:hidden">
            <Logo withText={false} />
          </div>
          <button
            onClick={() => setAssistantOpen(true)}
            className="ml-auto flex items-center gap-2 text-sm font-medium px-3.5 py-2 rounded-full bg-foreground text-background hover:opacity-90 transition"
          >
            <Bot size={16} />
            <span className="hidden sm:inline">Ask AI</span>
          </button>
        </header>
        <main className="flex-1 p-4 lg:p-8 max-w-6xl w-full mx-auto">
          {children}
        </main>
      </div>

      {/* Assistant drawer */}
      <AnimatePresence>
        {assistantOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setAssistantOpen(false)}
              className="fixed inset-0 bg-black/30 z-50"
            />
            <motion.div
              initial={{ x: 420 }}
              animate={{ x: 0 }}
              exit={{ x: 420 }}
              transition={{ type: "tween", duration: 0.28 }}
              className="fixed inset-y-0 right-0 w-full sm:w-[420px] bg-card border-l border-border z-50 flex flex-col"
            >
              <div className="h-16 border-b border-border flex items-center justify-between px-5">
                <span className="flex items-center gap-2 font-semibold">
                  <Bot size={18} /> AI Assistant
                </span>
                <button
                  onClick={() => setAssistantOpen(false)}
                  className="p-2 rounded-lg hover:bg-black/[.04]"
                  aria-label="Close"
                >
                  <X size={18} />
                </button>
              </div>
              <Assistant />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
