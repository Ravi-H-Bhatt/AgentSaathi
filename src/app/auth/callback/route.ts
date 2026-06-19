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
  const errorDescription = searchParams.get("error_description");
  const next = searchParams.get("next");

  // Google/Supabase returned an error (e.g. expired/bad state) — bounce to
  // login with a readable message instead of crashing.
  if (errorDescription) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(errorDescription)}`
    );
  }

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return NextResponse.redirect(
        `${origin}/login?error=${encodeURIComponent(error.message)}`
      );
    }
  }

  const agent = await getCurrentAgent();
  if (!agent) return NextResponse.redirect(`${origin}/login`);

  // If this sign-in came from an invite link, finish the invite flow.
  if (next && next.startsWith("/invite/")) {
    return NextResponse.redirect(`${origin}${next}`);
  }

  if (agent.role === "admin") return NextResponse.redirect(`${origin}/admin`);
  if (agent.status === "approved")
    return NextResponse.redirect(`${origin}/dashboard`);
  return NextResponse.redirect(`${origin}/pending`);
}
