// Service-role Supabase client. BYPASSES RLS — only for trusted server code
// (sign-up bootstrap, Postmark webhook, etc.). Never expose this client to
// the browser or pass its results back unfiltered.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { supabaseEnv, supabaseServiceRoleKey } from "./env";

let cached: SupabaseClient | null = null;

export function createSupabaseAdminClient(): SupabaseClient {
  if (cached) return cached;
  const { url } = supabaseEnv();
  const key = supabaseServiceRoleKey();
  cached = createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
  return cached;
}
