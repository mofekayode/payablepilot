// Supabase client for Server Components, Server Actions, and Route Handlers.
// Uses @supabase/ssr to bind to Next's cookie store so auth state is shared
// across the request.

import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { supabaseEnv } from "./env";

export async function createSupabaseServerClient() {
  const { url, anon } = supabaseEnv();
  const cookieStore = await cookies();
  return createServerClient(url, anon, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Server Components can't write cookies — Supabase falls back to
          // the next request. Middleware refreshes the session anyway.
        }
      },
    },
  });
}
