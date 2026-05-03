// OAuth token storage backed by the `connections` table in Supabase.
// Each (business_id, provider) pair has at most one row. The active business
// for the current request is resolved from the cookie/user_prefs by
// getActiveBusinessId() — that scopes every token operation to the right
// client even when the bookkeeper is managing multiple in the same session.

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireActiveBusinessId, getCurrentUser } from "@/lib/auth/current";
import { logAudit } from "@/lib/audit/log";

export type StoredTokens = {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number; // epoch ms
  extra?: Record<string, string>;
};

type Provider = "gmail" | "qbo";

function rowToTokens(row: {
  access_token: string;
  refresh_token: string | null;
  expires_at: string | null;
  extra: Record<string, string> | null;
}): StoredTokens {
  return {
    accessToken: row.access_token,
    refreshToken: row.refresh_token ?? undefined,
    expiresAt: row.expires_at ? new Date(row.expires_at).getTime() : undefined,
    extra: row.extra ?? undefined,
  };
}

export async function getTokens(provider: Provider): Promise<StoredTokens | null> {
  let businessId: string;
  try {
    businessId = await requireActiveBusinessId();
  } catch {
    return null;
  }
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("connections")
    .select("access_token, refresh_token, expires_at, extra")
    .eq("business_id", businessId)
    .eq("provider", provider)
    .maybeSingle();
  if (error || !data) return null;
  return rowToTokens(data);
}

export async function setTokens(provider: Provider, tokens: StoredTokens): Promise<void> {
  const businessId = await requireActiveBusinessId();
  await setTokensForBusiness(businessId, provider, tokens);
}

// Used by OAuth callbacks: the business the user clicked Connect from is
// captured at OAuth init time (in a state cookie), so we don't depend on
// the active-business cookie still pointing at the same business after the
// round-trip back from Google/Intuit.
export async function setTokensForBusiness(
  businessId: string,
  provider: Provider,
  tokens: StoredTokens
): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("connections").upsert(
    {
      business_id: businessId,
      provider,
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken ?? null,
      expires_at: tokens.expiresAt ? new Date(tokens.expiresAt).toISOString() : null,
      extra: tokens.extra ?? {},
    },
    { onConflict: "business_id,provider" }
  );
  if (error) throw new Error(`Failed to persist ${provider} tokens: ${error.message}`);
  const user = await getCurrentUser();
  await logAudit({
    action: "connection.set",
    businessId,
    actorUserId: user?.id,
    details: { provider },
  });
}

export async function clearTokens(provider: Provider): Promise<void> {
  const businessId = await requireActiveBusinessId();
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("connections")
    .delete()
    .eq("business_id", businessId)
    .eq("provider", provider);
  if (error) throw new Error(`Failed to clear ${provider} tokens: ${error.message}`);
  const user = await getCurrentUser();
  await logAudit({
    action: "connection.clear",
    businessId,
    actorUserId: user?.id,
    details: { provider },
  });
}

export async function isConnected(provider: Provider): Promise<boolean> {
  return (await getTokens(provider)) !== null;
}
