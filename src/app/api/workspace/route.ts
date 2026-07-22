import { NextResponse, type NextRequest } from "next/server";
import { getCurrentAgent } from "@/lib/auth";
import { WORKSPACE_COOKIE, isWorkspace, type Workspace } from "@/lib/workspace";

export const runtime = "nodejs";

const COOKIE_OPTS = {
  path: "/",
  httpOnly: true,
  sameSite: "lax" as const,
  // Session cookie (no maxAge): the choice lasts while the app/PWA is open,
  // but clears once it's fully closed — so every fresh open defaults to Home.
};

/**
 * Switch the active workspace via a FULL navigation (most reliable on mobile /
 * installed PWA — no client-router or service-worker cache in the way):
 *
 *   GET /api/workspace?to=lic&next=/dashboard
 *
 * Sets the cookie on the redirect response and 302s to the destination, which
 * is then server-rendered fresh with the new workspace. Defaults to "home".
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const agent = await getCurrentAgent();
  if (!agent || agent.status !== "approved") {
    return NextResponse.redirect(new URL("/login", url));
  }

  const to = url.searchParams.get("to");
  const ws: Workspace = isWorkspace(to) ? to : "home";

  // Only allow internal, same-origin destinations.
  const nextParam = url.searchParams.get("next") || "/dashboard";
  const dest = nextParam.startsWith("/") ? nextParam : "/dashboard";

  const res = NextResponse.redirect(new URL(dest, url));
  res.cookies.set(WORKSPACE_COOKIE, ws, COOKIE_OPTS);
  return res;
}

/** Programmatic switch (kept for completeness). Body: { workspace }. */
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
  const res = NextResponse.json({ ok: true, workspace });
  res.cookies.set(WORKSPACE_COOKIE, workspace, COOKIE_OPTS);
  return res;
}
