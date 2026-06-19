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
  UsersRound,
  MessageSquare,
} from "lucide-react";
import { Logo } from "@/components/Logo";
import { Assistant } from "@/components/Assistant";
import { TeamChat } from "@/components/TeamChat";
import { ClockWidget } from "@/components/ClockWidget";
import type { Permissions } from "@/lib/types";

export function AppShell({
  children,
  agentName,
  agentEmail,
  agentId,
  isColleague,
  permissions,
  openSince,
}: {
  children: React.ReactNode;
  agentName: string;
  agentEmail: string;
  agentId: string;
  isColleague: boolean;
  permissions: Permissions;
  openSince: string | null;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState<"ai" | "chat">("ai");

  // Build nav based on role/permissions.
  const nav: { href: string; label: string; icon: typeof LayoutDashboard }[] = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  ];
  if (!isColleague || permissions.clients)
    nav.push({ href: "/clients", label: "Clients", icon: Users });
  if (!isColleague || permissions.upload)
    nav.push({ href: "/upload", label: "Upload policy", icon: Upload });
  // Only owners manage colleagues.
  if (!isColleague)
    nav.push({ href: "/colleagues", label: "Colleagues", icon: UsersRound });

  const showAssistant = !isColleague || permissions.ai;

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
              className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                active
                  ? "bg-foreground text-background shadow-sm"
                  : "text-muted hover:bg-black/[.04] hover:text-foreground hover:pl-4"
              }`}
            >
              <item.icon
                size={18}
                className={`transition-transform duration-200 ${
                  active ? "" : "group-hover:scale-110"
                }`}
              />
              {item.label}
            </Link>
          );
        })}
        {showAssistant && (
          <button
            onClick={() => {
              setDrawerTab("ai");
              setDrawerOpen(true);
              setMobileOpen(false);
            }}
            className="group w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted hover:bg-black/[.04] hover:text-foreground hover:pl-4 transition-all duration-200"
          >
            <Bot size={18} className="transition-transform duration-200 group-hover:scale-110" />
            AI Assistant
          </button>
        )}
        <button
          onClick={() => {
            setDrawerTab("chat");
            setDrawerOpen(true);
            setMobileOpen(false);
          }}
          className="group w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted hover:bg-black/[.04] hover:text-foreground hover:pl-4 transition-all duration-200"
        >
          <MessageSquare size={18} className="transition-transform duration-200 group-hover:scale-110" />
          Team Chat
        </button>
      </nav>
      <div className="p-3 border-t border-border">
        <div className="flex items-center gap-3 px-2 py-2">
          <div className="h-8 w-8 rounded-full bg-foreground text-background flex items-center justify-center text-xs font-semibold shrink-0">
            {agentName.charAt(0).toUpperCase()}
          </div>
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
          <div className="ml-auto flex items-center gap-2">
            <ClockWidget openSince={openSince} />
            {showAssistant && (
              <button
                onClick={() => { setDrawerTab("ai"); setDrawerOpen(true); }}
                className="group flex items-center gap-2 text-sm font-medium px-3.5 py-2 rounded-full bg-foreground text-background hover:opacity-90 hover:scale-105 active:scale-95 transition-all duration-200 sheen"
              >
                <Bot size={16} className="transition-transform duration-300 group-hover:rotate-12" />
                <span className="hidden sm:inline">Ask AI</span>
              </button>
            )}
            <button
              onClick={() => { setDrawerTab("chat"); setDrawerOpen(true); }}
              className="group flex items-center gap-2 text-sm font-medium px-3.5 py-2 rounded-full border border-border hover:bg-black/[.04] transition-all duration-200"
              title="Team Chat"
            >
              <MessageSquare size={16} />
              <span className="hidden sm:inline">Chat</span>
            </button>
          </div>
        </header>
        <main className="flex-1 p-4 lg:p-8 max-w-6xl w-full mx-auto">
          {children}
        </main>
      </div>

      {/* Drawer (AI + Team Chat) */}
      <AnimatePresence>
        {drawerOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDrawerOpen(false)}
              className="fixed inset-0 bg-black/30 z-50"
            />
            <motion.div
              initial={{ x: 420 }}
              animate={{ x: 0 }}
              exit={{ x: 420 }}
              transition={{ type: "tween", duration: 0.28 }}
              className="fixed inset-y-0 right-0 w-full sm:w-[420px] bg-card border-l border-border z-50 flex flex-col"
            >
              {/* Drawer header with tabs */}
              <div className="h-16 border-b border-border flex items-center justify-between px-4 shrink-0">
                <div className="flex gap-1">
                  {showAssistant && (
                    <button
                      onClick={() => setDrawerTab("ai")}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                        drawerTab === "ai"
                          ? "bg-foreground text-background"
                          : "text-muted hover:bg-black/[.04] hover:text-foreground"
                      }`}
                    >
                      <Bot size={15} /> AI
                    </button>
                  )}
                  <button
                    onClick={() => setDrawerTab("chat")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                      drawerTab === "chat"
                        ? "bg-foreground text-background"
                        : "text-muted hover:bg-black/[.04] hover:text-foreground"
                    }`}
                  >
                    <MessageSquare size={15} /> Team Chat
                  </button>
                </div>
                <button
                  onClick={() => setDrawerOpen(false)}
                  className="p-2 rounded-lg hover:bg-black/[.04]"
                  aria-label="Close"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Drawer content */}
              <div className="flex-1 min-h-0 flex flex-col">
                {drawerTab === "ai" && showAssistant ? (
                  <Assistant />
                ) : (
                  <TeamChat currentUserId={agentId} />
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
