import { redirect } from "next/navigation";
import { Logo } from "@/components/Logo";
import { getCurrentAgent } from "@/lib/auth";
import { ApprovalWatcher } from "@/components/ApprovalWatcher";

export default async function PendingPage() {
  const agent = await getCurrentAgent();
  if (!agent) redirect("/login");
  if (agent.role === "admin") redirect("/admin");
  if (agent.status === "approved") redirect("/dashboard");

  const rejected = agent.status === "rejected";

  return (
    <div className="min-h-screen flex flex-col items-center justify-center grid-bg px-6">
      {/* Auto-redirects to the dashboard the moment the admin approves — no reload. */}
      {!rejected && <ApprovalWatcher />}
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-sm text-center">
        <div className="flex justify-center mb-6">
          <Logo />
        </div>
        <div
          className={`mx-auto mb-5 h-12 w-12 rounded-full flex items-center justify-center ${
            rejected ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-600"
          }`}
        >
          <span className="text-xl">{rejected ? "✕" : "⏳"}</span>
        </div>
        <h1 className="text-xl font-semibold">
          {rejected ? "Access not granted" : "Waiting for approval"}
        </h1>
        <p className="text-sm text-muted mt-2 leading-relaxed">
          {rejected
            ? "Your access request was declined. Please contact the administrator if you believe this is a mistake."
            : "Your account is signed in but needs administrator approval before you can access the dashboard. You'll get in as soon as you're approved."}
        </p>
        <p className="text-xs text-muted mt-4">Signed in as {agent.email}</p>
        <form action="/auth/signout" method="post" className="mt-6">
          <button className="text-sm font-medium px-4 py-2 rounded-full border border-border hover:bg-black/[.03] transition">
            Sign out
          </button>
        </form>
      </div>
    </div>
  );
}
