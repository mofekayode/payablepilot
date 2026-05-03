// Refreshes the Supabase session on every request, gates the protected
// route prefixes, and (in production) splits traffic between the marketing
// host (payablepilot.com) and the app host (app.payablepilot.com).
//
// Marketing host (no `app.` prefix): only `/` and `/legal/*` are served as
// pages; visiting any app path on the marketing host is redirected to the
// app subdomain. The app subdomain mirrors the inverse: hitting `/` on
// app.payablepilot.com goes to /app (signed in) or /sign-in (not).
//
// In dev (localhost) host-splitting is a no-op so everything works against
// a single origin.

import { NextRequest, NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

const PROTECTED_PREFIXES = ["/app", "/settings", "/onboarding", "/firm"];

// Paths that belong on the *app* host. If hit on the marketing host in
// production, we 308 over to the app subdomain.
const APP_ONLY_PREFIXES = [
  "/app",
  "/settings",
  "/onboarding",
  "/firm",
  "/sign-in",
  "/sign-up",
  "/forgot-password",
  "/reset-password",
  "/auth",
  "/invite",
  "/api",
];

function appOriginFromHost(host: string): string | null {
  // Strip a leading "app." if present so we can construct the sibling host.
  const lower = host.toLowerCase();
  const bareHost = lower.startsWith("app.") ? lower.slice(4) : lower;
  // Skip host-splitting for localhost / IP addresses / single-label hosts.
  if (!bareHost.includes(".") || bareHost.startsWith("localhost") || /^\d+\./.test(bareHost)) {
    return null;
  }
  return `https://app.${bareHost}`;
}

function marketingOriginFromHost(host: string): string | null {
  const lower = host.toLowerCase();
  if (!lower.startsWith("app.")) return null;
  const bare = lower.slice(4);
  if (!bare.includes(".") || bare.startsWith("localhost") || /^\d+\./.test(bare)) return null;
  return `https://${bare}`;
}

export async function proxy(req: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const host = (req.headers.get("host") ?? "").split(":")[0];
  const isAppHost = host.toLowerCase().startsWith("app.");
  const path = req.nextUrl.pathname;

  // ---------- Host-splitting (production only) ----------
  // Marketing host hitting an app-only path → bounce to the app subdomain.
  if (!isAppHost) {
    const appOrigin = appOriginFromHost(host);
    if (appOrigin) {
      const isAppPath = APP_ONLY_PREFIXES.some((p) => path === p || path.startsWith(p + "/"));
      if (isAppPath) {
        const target = new URL(path + req.nextUrl.search, appOrigin);
        return NextResponse.redirect(target, 308);
      }
    }
  }

  // App host hitting a marketing-only path (`/` or `/legal/*`) → bounce to
  // the marketing host. Without this, app.payablepilot.com/ would render
  // the landing page.
  if (isAppHost && (path === "/" || path === "/legal" || path.startsWith("/legal/"))) {
    // We'll override the redirect target below if Supabase is configured
    // and we know whether the user is signed in. Fall through if path is
    // /legal/* — those are fine on the marketing host.
    if (path !== "/") {
      const marketing = marketingOriginFromHost(host);
      if (marketing) {
        return NextResponse.redirect(new URL(path + req.nextUrl.search, marketing), 308);
      }
    }
  }

  // ---------- Supabase passthrough fallback ----------
  if (!url || !anon) {
    // Without Supabase env, we can't determine auth. For app host root,
    // best we can do is send users to /sign-in.
    if (isAppHost && path === "/") {
      return NextResponse.redirect(new URL("/sign-in", req.url));
    }
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
  const signedIn = !!data.user;

  // App host root: signed in → /app, not → /sign-in.
  if (isAppHost && path === "/") {
    return NextResponse.redirect(new URL(signedIn ? "/app" : "/sign-in", req.url));
  }

  const needsAuth = PROTECTED_PREFIXES.some((p) => path === p || path.startsWith(p + "/"));
  if (needsAuth && !signedIn) {
    const signIn = new URL("/sign-in", req.url);
    signIn.searchParams.set("next", path + req.nextUrl.search);
    return NextResponse.redirect(signIn);
  }

  return res;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
