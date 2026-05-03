// Supabase client for the browser. Use only in Client Components.

import { createBrowserClient } from "@supabase/ssr";
import { supabaseEnv } from "./env";

let cached: ReturnType<typeof createBrowserClient> | null = null;

export function createSupabaseBrowserClient() {
  if (cached) return cached;
  const { url, anon } = supabaseEnv();
  const client = createBrowserClient(url, anon);
  cached = client;

  // Realtime auth bridge.
  //
  // With @supabase/ssr, Postgres Changes subscriptions are subject to
  // RLS — but the realtime socket only enforces RLS using the JWT it
  // was opened with. The default behavior in some SSR setups leaves
  // realtime on the anon JWT, so RLS predicates that depend on
  // `auth.uid()` evaluate to null and every event is dropped before
  // reaching the browser.
  //
  // The fix: forward the user session's access_token to realtime on
  // load and on every auth state change. Cheap, no-op once cached.
  if (typeof window !== "undefined") {
    client.auth.getSession().then(({ data }) => {
      const token = data.session?.access_token ?? null;
      if (token) client.realtime.setAuth(token);
    });
    client.auth.onAuthStateChange((_event, session) => {
      const token = session?.access_token ?? null;
      client.realtime.setAuth(token);
    });
  }

  return client;
}
