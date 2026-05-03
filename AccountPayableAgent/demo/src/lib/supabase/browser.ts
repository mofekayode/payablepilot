// Supabase client for the browser. Use only in Client Components.

import { createBrowserClient } from "@supabase/ssr";
import { supabaseEnv } from "./env";

let cached: ReturnType<typeof createBrowserClient> | null = null;

export function createSupabaseBrowserClient() {
  if (cached) return cached;
  const { url, anon } = supabaseEnv();
  cached = createBrowserClient(url, anon);
  return cached;
}
