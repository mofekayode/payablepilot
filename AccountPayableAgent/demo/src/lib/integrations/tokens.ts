// OAuth token storage backed by the `connections` table in Supabase.
// Connections come in two flavors:
//   - business-scoped: one (business_id, provider) row, used by
//     per-business OAuth from inside a workspace.
//   - firm-scoped: one (firm_id, provider) row, used when the bookkeeper
//     connects ONE Gmail mailbox at the firm level and lets the routing
//     engine fan invoices out to the right business.
//
// The active business for the current request is resolved from the
// cookie/user_prefs by getActiveBusinessId() — that scopes business-level
// token operations to the right client. Firm-level helpers take an
// explicit firmId so they can be used from background workers that have
// no request context.

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
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
  // Manual upsert. We can't use supabase-js's .upsert({onConflict: ...})
  // here because the uniqueness is enforced by a partial index
  // (`WHERE business_id IS NOT NULL`), and Postgres won't match a partial
  // index from ON CONFLICT without the matching WHERE predicate, which
  // the supabase-js helper doesn't expose.
  const supabase = await createSupabaseServerClient();
  const tokenRow = {
    access_token: tokens.accessToken,
    refresh_token: tokens.refreshToken ?? null,
    expires_at: tokens.expiresAt ? new Date(tokens.expiresAt).toISOString() : null,
    extra: tokens.extra ?? {},
  };
  const { data: existing } = await supabase
    .from("connections")
    .select("id")
    .eq("business_id", businessId)
    .eq("provider", provider)
    .maybeSingle();
  if (existing) {
    const { error } = await supabase.from("connections").update(tokenRow).eq("id", existing.id);
    if (error) throw new Error(`Failed to update ${provider} tokens: ${error.message}`);
  } else {
    const { error } = await supabase
      .from("connections")
      .insert({ business_id: businessId, provider, ...tokenRow });
    if (error) throw new Error(`Failed to insert ${provider} tokens: ${error.message}`);
  }
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

// ----------------- Firm-scoped helpers (background-safe) -----------------
// These don't depend on request context (cookies / active-business). The
// admin client is used so they can be called from queue workers / cron
// jobs / Pub/Sub webhooks where there's no signed-in user.

export async function getTokensForFirm(
  firmId: string,
  provider: Provider
): Promise<StoredTokens | null> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("connections")
    .select("access_token, refresh_token, expires_at, extra")
    .eq("firm_id", firmId)
    .eq("provider", provider)
    .maybeSingle();
  if (error || !data) return null;
  return rowToTokens(data);
}

export async function setTokensForFirm(
  firmId: string,
  provider: Provider,
  tokens: StoredTokens,
  opts: { actorUserId?: string | null } = {}
): Promise<{ connectionId: string }> {
  // Manual upsert (see setTokensForBusiness for why supabase-js's .upsert
  // helper can't be used here — partial unique index limitation).
  const admin = createSupabaseAdminClient();
  const tokenRow = {
    access_token: tokens.accessToken,
    refresh_token: tokens.refreshToken ?? null,
    expires_at: tokens.expiresAt ? new Date(tokens.expiresAt).toISOString() : null,
    extra: tokens.extra ?? {},
  };
  const { data: existing } = await admin
    .from("connections")
    .select("id")
    .eq("firm_id", firmId)
    .eq("provider", provider)
    .maybeSingle();
  let connectionId: string;
  if (existing) {
    const { error } = await admin.from("connections").update(tokenRow).eq("id", existing.id);
    if (error) {
      throw new Error(`Failed to update firm-level ${provider} tokens: ${error.message}`);
    }
    connectionId = existing.id;
  } else {
    const { data, error } = await admin
      .from("connections")
      .insert({ firm_id: firmId, provider, ...tokenRow })
      .select("id")
      .single();
    if (error || !data) {
      throw new Error(`Failed to persist firm-level ${provider} tokens: ${error?.message ?? "unknown"}`);
    }
    connectionId = data.id;
  }
  await logAudit({
    action: "connection.set",
    firmId,
    actorUserId: opts.actorUserId ?? null,
    details: { provider, scope: "firm" },
  });
  return { connectionId };
}

export async function clearTokensForFirm(
  firmId: string,
  provider: Provider,
  opts: { actorUserId?: string | null } = {}
): Promise<void> {
  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from("connections")
    .delete()
    .eq("firm_id", firmId)
    .eq("provider", provider);
  if (error) throw new Error(`Failed to clear firm-level ${provider} tokens: ${error.message}`);
  await logAudit({
    action: "connection.clear",
    firmId,
    actorUserId: opts.actorUserId ?? null,
    details: { provider, scope: "firm" },
  });
}

// Like setTokensForFirm but only persists the refreshed token without
// re-emitting an audit event. Used by the auto-refresh path.
export async function refreshFirmTokens(
  firmId: string,
  provider: Provider,
  tokens: StoredTokens
): Promise<void> {
  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from("connections")
    .update({
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken ?? null,
      expires_at: tokens.expiresAt ? new Date(tokens.expiresAt).toISOString() : null,
      extra: tokens.extra ?? {},
    })
    .eq("firm_id", firmId)
    .eq("provider", provider);
  if (error) throw new Error(`Failed to refresh firm ${provider} tokens: ${error.message}`);
}
