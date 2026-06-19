import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentAgent } from "@/lib/auth";
import { Logo } from "@/components/Logo";
import { GoogleSignIn } from "@/components/GoogleSignIn";
import { Shield } from "lucide-react";
import type { Invitation, Permissions } from "@/lib/types";

export const dynamic = "force-dynamic";

const PERM_LABELS: { key: keyof Permissions; label: string }[] = [
  { key: "ai", label: "AI Assistant" },
  { key: "clients", label: "Clients" },
  { key: "upload", label: "Upload policies" },
  { key: "email", label: "Send reminders" },
];

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const db = createAdminClient();

  const { data: inviteRow } = await db
    .from("invitations")
    .select("*")
    .eq("token", token)
    .maybeSingle();

  const invite = inviteRow as Invitation | null;

  // Invalid / used / revoked invite.
  if (!invite || invite.status !== "pending") {
    return (
      <Shell>
        <h1 className="text-xl font-semibold">Invite not available</h1>
        <p className="text-sm text-muted mt-2">
          This invitation link is invalid, already used, or was revoked. Please
          ask your colleague to send a new one.
        </p>
        <Link
          href="/"
          className="inline-block mt-6 text-sm font-medium px-4 py-2 rounded-full border border-border hover:bg-black/[.03] transition"
        >
          Go home
        </Link>
      </Shell>
    );
  }

  // Who's the inviting agent?
  const { data: owner } = await db
    .from("agents")
    .select("full_name, email")
    .eq("id", invite.agent_id)
    .maybeSingle();
  const ownerName = owner?.full_name || owner?.email || "An agent";

  // Is the visitor signed in?
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Not signed in → show Google sign-in that returns here.
  if (!user) {
    return (
      <Shell>
        <div className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted border border-border rounded-full px-3 py-1 mb-4">
          <Shield size={13} /> Team invite
        </div>
        <h1 className="text-xl font-semibold">
          {ownerName} invited you to AgentSaathi
        </h1>
        <p className="text-sm text-muted mt-2 mb-5">
          Sign in with Google to join as a colleague. You&apos;ll get access to:
        </p>
        <PermissionList permissions={invite.permissions} />
        <div className="mt-6">
          <GoogleSignIn next={`/invite/${token}`} />
        </div>
      </Shell>
    );
  }

  // Signed in → link this user as a colleague of the inviting agent.
  const agent = await getCurrentAgent();
  if (!agent) redirect("/login");

  // The owner can't accept their own invite; existing colleagues just proceed.
  if (agent!.id === invite.agent_id) {
    redirect("/colleagues");
  }

  // Attach as colleague (idempotent) and mark invite accepted.
  await db
    .from("agents")
    .update({
      role: "colleague",
      status: "approved",
      parent_agent_id: invite.agent_id,
      permissions: invite.permissions,
    })
    .eq("id", agent!.id);

  await db
    .from("invitations")
    .update({
      status: "accepted",
      accepted_by: agent!.id,
      accepted_at: new Date().toISOString(),
    })
    .eq("id", invite.id);

  redirect("/dashboard");
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center grid-bg px-6">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-6">
          <Logo />
        </div>
        <div className="rounded-2xl border border-border bg-card p-8 shadow-sm">
          {children}
        </div>
      </div>
    </div>
  );
}

function PermissionList({ permissions }: { permissions: Permissions }) {
  return (
    <ul className="space-y-2">
      {PERM_LABELS.map((p) => {
        const on = permissions[p.key];
        return (
          <li
            key={p.key}
            className={`flex items-center gap-2 text-sm rounded-xl border px-3 py-2 ${
              on
                ? "border-foreground/20 bg-foreground/[.03]"
                : "border-border text-muted line-through opacity-60"
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full ${
                on ? "bg-green-500" : "bg-black/20"
              }`}
            />
            {p.label}
          </li>
        );
      })}
    </ul>
  );
}
