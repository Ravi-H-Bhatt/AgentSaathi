import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

export interface MaintenanceState {
  active: boolean;
  message: string | null;
}

/** Read the global maintenance ("work in progress") state. */
export async function getMaintenance(): Promise<MaintenanceState> {
  const db = createAdminClient();
  const { data } = await db
    .from("app_settings")
    .select("maintenance_mode, maintenance_message")
    .eq("id", true)
    .maybeSingle();

  const row = data as
    | { maintenance_mode: boolean; maintenance_message: string | null }
    | null;

  return {
    active: !!row?.maintenance_mode,
    message: row?.maintenance_message ?? null,
  };
}

/** Turn maintenance mode on/off (admin only — caller must check role). */
export async function setMaintenance(
  active: boolean,
  message?: string | null
): Promise<void> {
  const db = createAdminClient();
  await db
    .from("app_settings")
    .upsert(
      {
        id: true,
        maintenance_mode: active,
        maintenance_message: message ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    );
}
