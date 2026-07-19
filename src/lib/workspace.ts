import "server-only";

import { cookies } from "next/headers";

/**
 * A "workspace" is an independent data partition for an agent. Every client,
 * policy and activity-log row is tagged with one. The two dashboards never mix:
 *  - "home" — the original dashboard (all pre-existing data lives here).
 *  - "lic"  — a fresh, separate set for LIC business (starts empty / all zeros).
 */
export type Workspace = "home" | "lic";

export const WORKSPACE_COOKIE = "workspace";
export const WORKSPACES: Workspace[] = ["home", "lic"];

export function isWorkspace(v: unknown): v is Workspace {
  return v === "home" || v === "lic";
}

/**
 * The active workspace for the current request, read from the cookie.
 * Defaults to "home" so nothing changes for existing users until they switch.
 * Safe to call from Server Components and Route Handlers (request scope).
 */
export async function getWorkspace(): Promise<Workspace> {
  const store = await cookies();
  const value = store.get(WORKSPACE_COOKIE)?.value;
  return isWorkspace(value) ? value : "home";
}

/** Human label for a workspace (UI + activity log). */
export function workspaceLabel(w: Workspace | string | null | undefined): string {
  if (w === "lic") return "LIC";
  return "Home";
}
