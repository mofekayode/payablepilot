// Refreshes the Supabase session on every request and gates the protected
// route prefixes. If Supabase isn't configured (env missing), proxy
// becomes a passthrough so the dev server still boots — protected pages
// will surface a clear error from supabaseEnv() instead.

import { NextRequest, NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

const PROTECTED_PREFIXES = ["/app", "/settings", "/onboarding", "/firm"];

export async function proxy(req: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    return NextResponse.next();
  }

  const res = NextResponse.next({ request: req });

  const supabase = createServerClient(url, anon, {
    cookies: {
      getAll() {
        return req.cookies.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        cookiesToSet.forEach(({ name, value, options }) => {
          req.cookies.set(name, value);
          res.cookies.set(name, value, options);
        });
      },
    },
  });

  const { data } = await supabase.auth.getUser();
  const path = req.nextUrl.pathname;
  const needsAuth = PROTECTED_PREFIXES.some((p) => path === p || path.startsWith(p + "/"));

  if (needsAuth && !data.user) {
    const signIn = new URL("/sign-in", req.url);
    signIn.searchParams.set("next", path + req.nextUrl.search);
    return NextResponse.redirect(signIn);
  }

  return res;
}

export const config = {
  matcher: [
    // Match everything except next internals, static files, and the public
    // Supabase auth callback (which needs to run before any redirect).
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
