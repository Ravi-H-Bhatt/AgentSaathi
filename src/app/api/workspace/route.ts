import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { getCurrentAgent } from "@/lib/auth";
import { WORKSPACE_COOKIE, isWorkspace } from "@/lib/workspace";

export const runtime = "nodejs";

/**
 * Switch the active workspace (home | lic). Sets a cookie that every server
 * query reads. The client navigates + refreshes afterwards, so the switch is
 * effectively instant with no data bleed between the two dashboards.
 * POST /api/workspace  { workspace: "home" | "lic" }
 */
export async function POST(request: NextRequest) {
  const agent = await getCurrentAgent();
  if (!agent || agent.status !== "approved") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { workspace } = (await request.json().catch(() => ({}))) as {
    workspace?: unknown;
  };
  if (!isWorkspace(workspace)) {
    return NextResponse.json({ error: "Invalid workspace" }, { status: 400 });
  }

  const store = await cookies();
  store.set(WORKSPACE_COOKIE, workspace, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365, // remember the choice for a year
  });

  return NextResponse.json({ ok: true, workspace });
}
