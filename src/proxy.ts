import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * Next.js 16 Proxy (formerly Middleware).
 * Refreshes the Supabase auth session cookie on every request so Server
 * Components always see a valid session. Route-level role/approval checks
 * happen in the (app) layout, not here (proxy must stay fast).
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  // Never touch auth routes — refreshing cookies here can clobber the PKCE
  // code-verifier mid-handshake and cause "bad_oauth_state" errors.
  if (request.nextUrl.pathname.startsWith("/auth")) {
    return response;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  // Not configured yet — let pages render (they handle the unconfigured state).
  if (!url || !key) return response;

  const supabase = createServerClient(
    url,
    key,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  await supabase.auth.getUser();
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
