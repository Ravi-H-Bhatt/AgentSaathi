"use client";

import { useState, useEffect, useCallback } from "react";
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
  Mail,
} from "lucide-react";
import { Logo } from "@/components/Logo";
import { Assistant } from "@/components/Assistant";
import { TeamChat } from "@/components/TeamChat";
import { ProfileEditor } from "@/components/ProfileEditor";
import { WorkspaceSwitcher } from "@/components/WorkspaceSwitcher";
import { ReportIssue } from "@/components/ReportIssue";
import { NotificationToggle } from "@/components/NotificationToggle";
import { ClockWidget } from "@/components/ClockWidget";
import { MaintenanceWatcher } from "@/components/MaintenanceWatcher";
import type { Permissions } from "@/lib/types";
import type { Workspace } from "@/lib/workspace";

export function AppShell({
  children,
  agentName,
  agentEmail,
  agentPhone,
  agentId,
  isColleague,
  permissions,
  openSince,
  workspace,
  maintenanceActive = false,
  maintenanceMessage = null,
}: {
  children: React.ReactNode;
  agentName: string;
  agentEmail: string;
  agentPhone: string | null;
  agentId: string;
  isColleague: boolean;
  permissions: Permissions;
  openSince: string | null;
  workspace: Workspace;
  maintenanceActive?: boolean;
  maintenanceMessage?: string | null;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState<"ai" | "chat">("ai");
  const [hasUnread, setHasUnread] = useState(false);
  const [lastCheckTime, setLastCheckTime] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState(agentName);

  // Build nav based on role/permissions.
  const nav: { href: string; label: string; icon: typeof LayoutDashboard }[] = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  ];
  if (!isColleague || permissions.clients)
    nav.push({ href: "/clients", label: "Clients", icon: Users });
  if (!isColleague || permissions.upload)
    nav.push({ href: "/upload", label: "Upload policy", icon: Upload });
  // Email composer
  nav.push({ href: "/email", label: "Compose Email", icon: Mail });
  // Only owners manage colleagues.
  if (!isColleague)
    nav.push({ href: "/colleagues", label: "Colleagues", icon: UsersRound });

  const showAssistant = !isColleague || permissions.ai;

  // Check for unread messages
  const checkUnread = useCallback(async () => {
    try {
      const url = lastCheckTime 
        ? `/api/chat?since=${encodeURIComponent(lastCheckTime)}`
        : "/api/chat";
      const res = await fetch(url);
      const data = await res.json();
      const messages = data.messages || [];
      if (messages.length > 0) {
        const latestTime = messages[messages.length - 1].created_at;
        setLastCheckTime(latestTime);
        // Only show unread if drawer is closed and message is from someone else
        if (!drawerOpen) {
          const hasNewFromOthers = messages.some((m: any) => m.sender_id !== agentId);
          if (hasNewFromOthers) {
            setHasUnread(true);
          }
        }
      }
    } catch {
      // Ignore errors
    }
  }, [lastCheckTime, drawerOpen, agentId]);

  // Poll for new messages every 10 seconds (reduced from 8 for better performance)
  useEffect(() => {
    checkUnread();
    const interval = setInterval(checkUnread, 10000);
    return () => clearInterval(interval);
  }, [checkUnread]);

  // Clear unread when drawer opens to chat tab
  useEffect(() => {
    if (drawerOpen && drawerTab === "chat") {
      setHasUnread(false);
    }
  }, [drawerOpen, drawerTab]);

  const SidebarContent = (
    <div className="flex flex-col h-full">
      <div className="min-h-16 pt-[env(safe-area-inset-top)] flex items-center px-5 border-b border-border">
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
              prefetch={true}
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
            setHasUnread(false);
          }}
          className="group w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted hover:bg-black/[.04] hover:text-foreground hover:pl-4 transition-all duration-200 relative"
        >
          <MessageSquare size={18} className="transition-transform duration-200 group-hover:scale-110" />
          Team Chat
          {hasUnread && (
            <span className="absolute left-1 top-2 h-2 w-2 bg-green-500 rounded-full animate-pulse" />
          )}
        </button>
      </nav>
      <div className="p-3 border-t border-border">
        <div className="flex items-center gap-3 px-2 py-2">
          <div className="h-8 w-8 rounded-full bg-foreground text-background flex items-center justify-center text-xs font-semibold shrink-0">
            {displayName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium truncate">{displayName}</p>
            <p className="text-xs text-muted truncate">{agentEmail}</p>
          </div>
        </div>
        <WorkspaceSwitcher current={workspace} />
        <ProfileEditor
          currentName={displayName}
          currentPhone={agentPhone ?? ""}
          isColleague={isColleague}
          onUpdate={(newName) => setDisplayName(newName)}
        />
        <NotificationToggle />
        <ReportIssue />
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
      {/* Live "work in progress" overlay — polls every 2s, no refresh needed */}
      <MaintenanceWatcher
        initialActive={maintenanceActive}
        initialMessage={maintenanceMessage}
      />

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
        <header className="min-h-16 pt-[env(safe-area-inset-top)] border-b border-border bg-background/80 backdrop-blur sticky top-0 z-30 flex items-center justify-between px-4 lg:px-8">
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
          <div className="ml-auto flex items-center gap-1.5 sm:gap-2 min-w-0">
            <ClockWidget openSince={openSince} />
            {showAssistant && (
              <button
                onClick={() => { setDrawerTab("ai"); setDrawerOpen(true); }}
                className="group flex items-center gap-2 text-sm font-medium px-3 sm:px-3.5 py-2 rounded-full bg-foreground text-background hover:opacity-90 hover:scale-105 active:scale-95 transition-all duration-200 sheen shrink-0"
              >
                <Bot size={16} className="transition-transform duration-300 group-hover:rotate-12" />
                <span className="hidden sm:inline">Ask AI</span>
              </button>
            )}
            <button
              onClick={() => { 
                setDrawerTab("chat"); 
                setDrawerOpen(true); 
                setHasUnread(false);
              }}
              className="group relative flex items-center gap-2 text-sm font-medium px-3 sm:px-3.5 py-2 rounded-full border border-border hover:bg-black/[.04] transition-all duration-200 shrink-0"
              title="Team Chat"
            >
              <MessageSquare size={16} />
              <span className="hidden sm:inline">Chat</span>
              {hasUnread && (
                <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 bg-green-500 rounded-full animate-pulse border border-background" />
              )}
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
                    onClick={() => {
                      setDrawerTab("chat");
                      setHasUnread(false);
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition relative ${
                      drawerTab === "chat"
                        ? "bg-foreground text-background"
                        : "text-muted hover:bg-black/[.04] hover:text-foreground"
                    }`}
                  >
                    <MessageSquare size={15} /> Chat
                    {hasUnread && drawerTab !== "chat" && (
                      <span className="absolute -top-0.5 -right-0.5 h-2 w-2 bg-green-500 rounded-full animate-pulse" />
                    )}
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
