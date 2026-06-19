import "server-only";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Agent } from "@/lib/types";

export const ADMIN_EMAIL = (
  process.env.NEXT_PUBLIC_ADMIN_EMAIL || "ravihbhatt05@gmail.com"
).toLowerCase();

/**
 * Returns the current authenticated agent row, creating it on first sign-in.
 * The admin email is auto-promoted to role=admin, status=approved.
 * Returns null when no user is signed in.
 */
export async function getCurrentAgent(): Promise<Agent | null> {
  // Not configured yet (e.g. before env vars are set) — treat as signed out.
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY
  ) {
    return null;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const admin = createAdminClient();
  const email = (user.email || "").toLowerCase();
  const isAdmin = email === ADMIN_EMAIL;

  // Fetch existing agent row.
  const { data: existing } = await admin
    .from("agents")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (existing) {
    // Keep admin promotion in sync if the admin signed in.
    if (isAdmin && (existing.role !== "admin" || existing.status !== "approved")) {
      const { data: updated } = await admin
        .from("agents")
        .update({ role: "admin", status: "approved" })
        .eq("id", user.id)
        .select("*")
        .single();
      return updated as Agent;
    }
    return existing as Agent;
  }

  // First sign-in: create the agent row.
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const { data: created } = await admin
    .from("agents")
    .insert({
      id: user.id,
      email,
      full_name: (meta.full_name as string) || (meta.name as string) || null,
      avatar_url: (meta.avatar_url as string) || (meta.picture as string) || null,
      role: isAdmin ? "admin" : "agent",
      status: isAdmin ? "approved" : "pending",
    })
    .select("*")
    .single();

  return created as Agent;
}
