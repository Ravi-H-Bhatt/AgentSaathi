import { NextResponse } from "next/server";
import { getMaintenance } from "@/lib/settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Lightweight public-ish endpoint the agent app polls to know whether
 * maintenance ("work in progress") mode is active. No sensitive data.
 */
export async function GET() {
  try {
    const state = await getMaintenance();
    return NextResponse.json(state, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    // If the settings table doesn't exist yet, treat as not in maintenance.
    return NextResponse.json({ active: false, message: null });
  }
}
