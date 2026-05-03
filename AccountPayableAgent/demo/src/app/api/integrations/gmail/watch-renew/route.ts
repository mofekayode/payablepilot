// Cron endpoint: renews Gmail Push watches before they expire.
// Gmail's users.watch lasts at most 7 days. We renew every 24h for any
// connection whose watch_expires_at is within 48 hours.
//
// First-time arm (right after OAuth) happens in the OAuth callback.
// This cron is purely the keepalive.

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { buildGmailFromTokens, startWatch } from "@/lib/integrations/gmail";
import { refreshFirmTokens } from "@/lib/integrations/tokens";

function isAuthorized(req: NextRequest): boolean {
  const expected = process.env.QUEUE_RUN_SECRET || process.env.CRON_SECRET;
  if (!expected) return false;
  const header = req.headers.get("authorization") ?? "";
  if (header === `Bearer ${expected}`) return true;
  const url = new URL(req.url);
  if (url.searchParams.get("secret") === expected) return true;
  return false;
}

const RENEW_WITHIN_HOURS = 48;

async function handle(req: NextRequest) {
  if (!isAuthorized(req)) return new NextResponse("unauthorized", { status: 401 });

  const topic = process.env.GMAIL_PUBSUB_TOPIC;
  if (!topic) {
    return NextResponse.json({ ok: true, skipped: "no_topic_configured" });
  }

  const admin = createSupabaseAdminClient();
  const cutoff = new Date(Date.now() + RENEW_WITHIN_HOURS * 60 * 60 * 1000).toISOString();

  // Connections whose watch is expiring soon, OR has never been armed.
  const { data: due } = await admin
    .from("connections")
    .select(`
      id, firm_id, access_token, refresh_token, expires_at, extra,
      gmail_sync_state ( watch_expires_at )
    `)
    .eq("provider", "gmail")
    .not("firm_id", "is", null);

  if (!due) return NextResponse.json({ ok: true, renewed: 0 });

  let renewed = 0;
  for (const c of due) {
    const sync = (c as unknown as { gmail_sync_state?: { watch_expires_at: string | null } | null }).gmail_sync_state;
    const expires = sync?.watch_expires_at ?? null;
    if (expires && expires > cutoff) continue;

    try {
      const gmail = await buildGmailFromTokens(
        {
          accessToken: c.access_token,
          refreshToken: c.refresh_token ?? undefined,
          expiresAt: c.expires_at ? new Date(c.expires_at).getTime() : undefined,
          extra: (c.extra ?? {}) as Record<string, string>,
        },
        async (refreshed) => {
          await refreshFirmTokens(c.firm_id!, "gmail", refreshed);
        }
      );
      const watch = await startWatch(gmail, topic);
      await admin
        .from("gmail_sync_state")
        .upsert({
          connection_id: c.id,
          watch_expires_at: new Date(watch.expiration).toISOString(),
          // Don't clobber last_history_id on renewal; the existing one
          // is still our resume point. If empty (very first arm),
          // record the historyId as our starting point.
          ...(watch.historyId ? {} : {}),
        });
      renewed++;
    } catch (e) {
      console.error(`[watch-renew] firm ${c.firm_id}:`, e);
    }
  }

  return NextResponse.json({ ok: true, renewed });
}

export const GET = handle;
export const POST = handle;
