// Resolves where to send the user after completing an OAuth round trip.
// Order: ?return_to= query param > Referer header > /settings (default).
// Whitelisted to internal paths only — never honor an absolute URL or a
// path that doesn't start with a single "/".

import type { NextRequest } from "next/server";

const ALLOWED_PREFIXES = ["/onboarding", "/settings", "/app"];

function safe(path: string | null | undefined): string | null {
  if (!path) return null;
  if (!path.startsWith("/") || path.startsWith("//")) return null;
  if (!ALLOWED_PREFIXES.some((p) => path === p || path.startsWith(p + "/") || path.startsWith(p + "?"))) return null;
  return path;
}

export function resolveReturnTo(req: NextRequest): string {
  const url = new URL(req.url);
  const fromQuery = safe(url.searchParams.get("return_to"));
  if (fromQuery) return fromQuery;

  const ref = req.headers.get("referer");
  if (ref) {
    try {
      const refUrl = new URL(ref);
      // Same-origin only.
      if (refUrl.origin === url.origin) {
        const candidate = refUrl.pathname + refUrl.search;
        const safeRef = safe(candidate);
        if (safeRef) return safeRef;
      }
    } catch {
      // ignore
    }
  }
  return "/settings";
}

export function appendFlash(returnTo: string, params: Record<string, string>): string {
  const [path, existing = ""] = returnTo.split("?");
  const search = new URLSearchParams(existing);
  for (const [k, v] of Object.entries(params)) search.set(k, v);
  return `${path}?${search.toString()}`;
}
