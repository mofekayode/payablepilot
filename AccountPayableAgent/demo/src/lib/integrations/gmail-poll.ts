// Polling-based ingestion for firm-level Gmail mailboxes.
//
// This is the v1 ingestion path — runs on a Vercel Cron every few minutes
// against every firm-level Gmail connection in the database. New messages
// get inserted into inbox_messages and queued for routing.
//
// The Push webhook (Pub/Sub via users.watch) is the real-time path. They
// can coexist: Push delivers within seconds; polling is the safety net
// for the cases where a notification is dropped or the watch lapses.

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  buildGmailFromTokens,
  listInvoiceMessages,
  type GmailAttachment,
  downloadAttachment,
} from "./gmail";
import { getTokensForFirm, refreshFirmTokens } from "./tokens";
import { enqueue } from "@/lib/queue/enqueue";

const MAX_PER_MAILBOX = 50;
const ATTACHMENT_PREFETCH_MAX_BYTES = 1_500_000; // 1.5 MB per attachment cap

// How far back the safety-net poll looks. Push picks things up in real
// time, so the poll only needs to cover the gap if a notification was
// dropped. One hour is generous; the dedup-by-message_id check prevents
// double-ingestion when the windows overlap. Override via
// GMAIL_POLL_LOOKBACK_MINUTES env var.
function lookbackWindow(): string {
  const minutes = Math.max(5, Number(process.env.GMAIL_POLL_LOOKBACK_MINUTES ?? 60));
  // Gmail accepts compact units. Convert to "Nh" for >=60min, else "Nm".
  if (minutes >= 60) return `${Math.ceil(minutes / 60)}h`;
  return `${minutes}m`;
}

export async function pollAllFirmMailboxes(): Promise<{
  mailboxes: number;
  newMessages: number;
}> {
  const admin = createSupabaseAdminClient();
  const { data: connections, error } = await admin
    .from("connections")
    .select("id, firm_id, access_token, refresh_token, expires_at, extra")
    .eq("provider", "gmail")
    .not("firm_id", "is", null);

  if (error) throw new Error(`pollAllFirmMailboxes: ${error.message}`);

  let totalNew = 0;
  for (const c of connections ?? []) {
    if (!c.firm_id) continue;
    try {
      const n = await pollOneFirmMailbox({
        connectionId: c.id,
        firmId: c.firm_id,
        accessToken: c.access_token,
        refreshToken: c.refresh_token ?? undefined,
        expiresAt: c.expires_at ? new Date(c.expires_at).getTime() : undefined,
        extra: (c.extra ?? {}) as Record<string, string>,
      });
      totalNew += n;
    } catch (e) {
      console.error(`[gmail-poll] firm ${c.firm_id}:`, e);
    }
  }

  return { mailboxes: (connections ?? []).length, newMessages: totalNew };
}

export async function pollOneFirmMailbox(opts: {
  connectionId: string;
  firmId: string;
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
  extra: Record<string, string>;
}): Promise<number> {
  const admin = createSupabaseAdminClient();
  const gmail = await buildGmailFromTokens(
    {
      accessToken: opts.accessToken,
      refreshToken: opts.refreshToken,
      expiresAt: opts.expiresAt,
      extra: opts.extra,
    },
    async (refreshed) => {
      await refreshFirmTokens(opts.firmId, "gmail", refreshed);
    }
  );

  // Fetch the most recent invoice-flavored messages within the safety-net
  // window. Dedup against rows we've already ingested by Gmail message_id
  // — that's what prevents the overlap between Push and the next poll
  // creating duplicate inbox_messages rows (and false-positive duplicate
  // bill flags downstream).
  const messages = await listInvoiceMessages({
    client: gmail,
    maxResults: MAX_PER_MAILBOX,
    newerThan: lookbackWindow(),
  });
  if (messages.length === 0) {
    await touchPollState(opts.connectionId);
    return 0;
  }

  const ids = messages.map((m) => m.id);
  const { data: existing } = await admin
    .from("inbox_messages")
    .select("message_id")
    .eq("firm_id", opts.firmId)
    .in("message_id", ids);
  const seen = new Set((existing ?? []).map((r) => r.message_id));

  let inserted = 0;
  for (const m of messages) {
    if (seen.has(m.id)) continue;
    const fromHeader = parseFromAddress(m.from);
    const firstAttachment = m.attachments[0];
    let attachmentForRouting: { base64: string; mimeType: string; filename: string } | null = null;
    if (firstAttachment && firstAttachment.size <= ATTACHMENT_PREFETCH_MAX_BYTES) {
      try {
        const dl = await downloadAttachment(m.id, firstAttachment.attachmentId, gmail);
        attachmentForRouting = {
          base64: dl.base64,
          mimeType: firstAttachment.mimeType,
          filename: firstAttachment.filename,
        };
      } catch (e) {
        console.error(`[gmail-poll] download attachment failed for ${m.id}:`, e);
      }
    }

    const { data: row, error: insertErr } = await admin
      .from("inbox_messages")
      .insert({
        firm_id: opts.firmId,
        source: "gmail",
        message_id: m.id,
        from_email: fromHeader.email,
        from_name: fromHeader.name,
        to_email: null,
        subject: m.subject,
        received_at: m.receivedAt ? new Date(m.receivedAt).toISOString() : new Date().toISOString(),
        parsed_json: {
          snippet: m.snippet,
          attachments: attachmentForRouting
            ? [attachmentForRouting]
            : m.attachments.map((a: GmailAttachment) => ({
                filename: a.filename,
                mimeType: a.mimeType,
                size: a.size,
              })),
        },
        routing_status: "unmatched",
      })
      .select("id")
      .single();
    if (insertErr || !row) {
      console.error(`[gmail-poll] insert failed for ${m.id}:`, insertErr);
      continue;
    }
    inserted++;
    await enqueue({
      firmId: opts.firmId,
      type: "process_inbound_email",
      payload: { inboxMessageId: row.id },
    });
  }

  await touchPollState(opts.connectionId);
  return inserted;
}

async function touchPollState(connectionId: string) {
  const admin = createSupabaseAdminClient();
  await admin
    .from("gmail_sync_state")
    .upsert({ connection_id: connectionId, last_polled_at: new Date().toISOString() });
}

function parseFromAddress(raw: string): { email: string; name: string | null } {
  // "Acme <ap@acme.co>" → { name: "Acme", email: "ap@acme.co" }
  const m = raw.match(/^\s*(?:"?([^"<]+?)"?\s*)?<([^>]+)>\s*$/);
  if (m) return { name: m[1]?.trim() || null, email: m[2].trim().toLowerCase() };
  return { name: null, email: raw.trim().toLowerCase() };
}
