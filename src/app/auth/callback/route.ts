import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentAgent } from "@/lib/auth";

/**
 * OAuth callback: exchanges the code for a session, ensures the agent row
 * exists, then routes by role/status.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  const agent = await getCurrentAgent();
  if (!agent) return NextResponse.redirect(`${origin}/login`);
  if (agent.role === "admin") return NextResponse.redirect(`${origin}/admin`);
  if (agent.status === "approved")
    return NextResponse.redirect(`${origin}/dashboard`);
  return NextResponse.redirect(`${origin}/pending`);
}
