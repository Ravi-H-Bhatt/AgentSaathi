"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentAgent } from "@/lib/auth";
import { setMaintenance } from "@/lib/settings";
import { sendWelcomeEmail } from "@/lib/mailer";
import type { AgentStatus } from "@/lib/types";

/** Admin-only: toggle global maintenance ("work in progress") mode. */
export async function toggleMaintenance(active: boolean, message?: string) {
  const me = await getCurrentAgent();
  if (!me || me.role !== "admin") throw new Error("Forbidden");
  await setMaintenance(active, message ?? null);
  revalidatePath("/admin");
}

/** Admin-only: set an agent's approval status. */
export async function setAgentStatus(agentId: string, status: AgentStatus) {
  const me = await getCurrentAgent();
  if (!me || me.role !== "admin") {
    throw new Error("Forbidden");
  }
  const db = createAdminClient();

  // Read the current row so we only send the welcome email on the transition
  // into "approved" (not on every re-save of an already-approved agent).
  const { data: before } = await db
    .from("agents")
    .select("status, email")
    .eq("id", agentId)
    .eq("role", "agent")
    .maybeSingle();

  await db.from("agents").update({ status }).eq("id", agentId).eq("role", "agent");
  revalidatePath("/admin");

  if (status === "approved" && before?.status !== "approved" && before?.email) {
    await sendWelcomeEmail(before.email);
  }
}

/**
 * Admin-only: revoke or restore a colleague's access.
 * Colleagues join through an agent's invite link (no admin approval needed),
 * so there is no "pending" step — the admin can only revoke (block) or restore.
 */
export async function setColleagueStatus(
  colleagueId: string,
  status: "approved" | "rejected"
) {
  const me = await getCurrentAgent();
  if (!me || me.role !== "admin") {
    throw new Error("Forbidden");
  }
  const db = createAdminClient();

  const { data: before } = await db
    .from("agents")
    .select("status, email")
    .eq("id", colleagueId)
    .eq("role", "colleague")
    .maybeSingle();

  await db
    .from("agents")
    .update({ status })
    .eq("id", colleagueId)
    .eq("role", "colleague");
  revalidatePath("/admin");

  if (status === "approved" && before?.status !== "approved" && before?.email) {
    await sendWelcomeEmail(before.email);
  }
}

/** Admin-only: add a premium chart row. */
export async function addPremiumRow(formData: FormData) {
  const me = await getCurrentAgent();
  if (!me || me.role !== "admin") throw new Error("Forbidden");

  const db = createAdminClient();
  await db.from("premium_charts").insert({
    policy_type: (formData.get("policy_type") as string) || null,
    age_min: Number(formData.get("age_min")),
    age_max: Number(formData.get("age_max")),
    sum_insured: formData.get("sum_insured")
      ? Number(formData.get("sum_insured"))
      : null,
    premium: Number(formData.get("premium")),
    notes: (formData.get("notes") as string) || null,
  });
  revalidatePath("/admin/premiums");
}

/** Admin-only: delete a premium chart row. */
export async function deletePremiumRow(id: string) {
  const me = await getCurrentAgent();
  if (!me || me.role !== "admin") throw new Error("Forbidden");
  const db = createAdminClient();
  await db.from("premium_charts").delete().eq("id", id);
  revalidatePath("/admin/premiums");
}

/** Admin-only: bulk insert parsed premium rows. */
export async function addPremiumRows(
  rows: {
    policy_type: string | null;
    age_min: number;
    age_max: number;
    sum_insured: number | null;
    premium: number;
  }[]
) {
  const me = await getCurrentAgent();
  if (!me || me.role !== "admin") throw new Error("Forbidden");
  const db = createAdminClient();
  await db.from("premium_charts").insert(rows);
  revalidatePath("/admin/premiums");
}


/** Admin-only: mark an error report as resolved (or reopen). */
export async function setReportStatus(id: string, status: "open" | "resolved") {
  const me = await getCurrentAgent();
  if (!me || me.role !== "admin") throw new Error("Forbidden");
  const db = createAdminClient();
  await db.from("error_reports").update({ status }).eq("id", id);
  revalidatePath("/admin/reports");
}
