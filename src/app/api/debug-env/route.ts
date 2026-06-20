import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * Diagnostic only — reports whether key env vars are PRESENT in the running
 * environment. Never returns the actual secret values. Remove after debugging.
 */
export async function GET() {
  const groq = process.env.GROQ_API_KEY || "";
  return NextResponse.json({
    GROQ_API_KEY_present: groq.length > 0,
    GROQ_API_KEY_length: groq.length,
    GROQ_API_KEY_prefix: groq ? groq.slice(0, 4) : null,
    GROQ_MODEL: process.env.GROQ_MODEL || null,
    TAVILY_present: !!process.env.TAVILY_API_KEY,
    SUPABASE_URL_present: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    SERVICE_ROLE_present: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    SMTP_USER_present: !!process.env.SMTP_USER,
  });
}
