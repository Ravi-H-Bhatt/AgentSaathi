import Link from "next/link";
import { redirect } from "next/navigation";
import { Logo } from "@/components/Logo";
import { Landing } from "@/components/Landing";
import { getCurrentAgent } from "@/lib/auth";

export default async function Home() {
  const agent = await getCurrentAgent();
  if (agent) {
    if (agent.role === "admin") redirect("/admin");
    if (agent.status === "approved") redirect("/dashboard");
    redirect("/pending");
  }

  return (
    <div className="min-h-screen flex flex-col grid-bg">
      <header className="w-full border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto max-w-6xl px-6 h-16 flex items-center justify-between">
          <Logo />
          <Link
            href="/login"
            className="text-sm font-medium px-4 py-2 rounded-full bg-foreground text-background hover:opacity-90 transition"
          >
            Sign in
          </Link>
        </div>
      </header>
      <Landing />
      <footer className="border-t border-border py-8">
        <div className="mx-auto max-w-6xl px-6 flex items-center justify-between text-sm text-muted">
          <span>© {new Date().getFullYear()} AgentSaathi</span>
          <span>Built for insurance professionals</span>
        </div>
      </footer>
    </div>
  );
}
