"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Users, BarChart3, LogOut, Flag } from "lucide-react";
import { Logo } from "@/components/Logo";

const nav = [
  { href: "/admin", label: "Agents", icon: Users },
  { href: "/admin/premiums", label: "Premium charts", icon: BarChart3 },
  { href: "/admin/reports", label: "Issue reports", icon: Flag },
];

export function AdminShell({
  children,
  agentEmail,
}: {
  children: React.ReactNode;
  agentEmail: string;
}) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen flex flex-col">
      <header className="h-16 border-b border-border bg-card sticky top-0 z-30">
        <div className="h-full px-4 lg:px-8 flex items-center justify-between max-w-6xl mx-auto w-full">
          <div className="flex items-center gap-8">
            <Logo />
            <span className="text-xs font-semibold uppercase tracking-wide bg-foreground text-background px-2 py-1 rounded-full">
              Admin
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted hidden sm:block">
              {agentEmail}
            </span>
            <form action="/auth/signout" method="post">
              <button className="inline-flex items-center gap-2 text-sm font-medium px-3 py-2 rounded-full border border-border hover:bg-black/[.03] transition">
                <LogOut size={15} /> Sign out
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
        {children}
      </div>
    </div>
  );
}
