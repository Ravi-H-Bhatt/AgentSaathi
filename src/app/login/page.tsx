import Link from "next/link";
import { redirect } from "next/navigation";
import { Logo } from "@/components/Logo";
import { GoogleSignIn } from "@/components/GoogleSignIn";
import { getCurrentAgent } from "@/lib/auth";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const agent = await getCurrentAgent();
  if (agent) {
    if (agent.role === "admin") redirect("/admin");
    if (agent.status === "approved") redirect("/dashboard");
    redirect("/pending");
  }

  const { error } = await searchParams;

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Left brand panel */}
      <div className="hidden lg:flex flex-col justify-between bg-foreground text-background p-12">
        <Logo light />
        <div>
          <h2 className="text-3xl font-bold leading-tight max-w-sm">
            Your book of business, organized and intelligent.
          </h2>
          <p className="mt-4 text-white/60 max-w-sm">
            Sign in to manage clients, track renewals, and get instant answers
            from your own data.
          </p>
        </div>
        <span className="text-white/40 text-sm">
          © {new Date().getFullYear()} AgentSaathi
        </span>
      </div>

      {/* Right sign-in */}
      <div className="flex flex-col items-center justify-center p-8 grid-bg">
        <div className="w-full max-w-sm">
          <div className="lg:hidden mb-8 flex justify-center">
            <Logo />
          </div>
          <div className="rounded-2xl border border-border bg-card p-8 shadow-sm">
            <h1 className="text-xl font-semibold">Sign in</h1>
            <p className="text-sm text-muted mt-1 mb-6">
              Continue with your Google account.
            </p>
            {error && (
              <div className="mb-4 rounded-xl bg-red-50 text-red-700 px-4 py-3 text-sm">
                {error}
              </div>
            )}
            <GoogleSignIn />
            <p className="text-xs text-muted mt-6 leading-relaxed">
              New agents need admin approval before accessing the dashboard.
            </p>
          </div>
          <Link
            href="/"
            className="block text-center text-sm text-muted mt-6 hover:text-foreground transition"
          >
            ← Back home
          </Link>
        </div>
      </div>
    </div>
  );
}
