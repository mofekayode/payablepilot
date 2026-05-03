// Firm-level Gmail status helpers used by the UI. Reads from the
// connections table without exposing token internals.

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type FirmGmailStatus = {
  connected: boolean;
  email: string | null;
  connectionId: string | null;
};

// Server-component variant: respects RLS (caller must be a firm member).
export async function getFirmGmailStatus(firmId: string): Promise<FirmGmailStatus> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("connections")
    .select("id, extra")
    .eq("firm_id", firmId)
    .eq("provider", "gmail")
    .maybeSingle();
  if (!data) return { connected: false, email: null, connectionId: null };
  const extra = (data.extra ?? {}) as Record<string, string>;
  return {
    connected: true,
    email: extra.email ?? null,
    connectionId: data.id,
  };
}

// Background-safe variant for workers / cron / webhooks.
export async function getFirmGmailStatusAdmin(firmId: string): Promise<FirmGmailStatus> {
  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from("connections")
    .select("id, extra")
    .eq("firm_id", firmId)
    .eq("provider", "gmail")
    .maybeSingle();
  if (!data) return { connected: false, email: null, connectionId: null };
  const extra = (data.extra ?? {}) as Record<string, string>;
  return {
    connected: true,
    email: extra.email ?? null,
    connectionId: data.id,
  };
}

// Resolves the active user's firm, used by the onboarding/settings pages.
export async function getCurrentFirmId(): Promise<string | null> {
  const supabase = await createSupabaseServerClient();
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) return null;
  const { data } = await supabase
    .from("firm_members")
    .select("firm_id")
    .eq("user_id", user.user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  return data?.firm_id ?? null;
}
