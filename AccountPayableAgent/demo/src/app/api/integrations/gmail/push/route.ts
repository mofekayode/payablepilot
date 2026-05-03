// Pub/Sub webhook for Gmail Push notifications.
//
// Setup (one-time, in GCP):
//   1. Create a Pub/Sub topic, e.g. projects/<gcp-project>/topics/gmail-push
//   2. Grant the Gmail service account
//      (gmail-api-push@system.gserviceaccount.com) the
//      "Pub/Sub Publisher" role on that topic.
//   3. Create a push subscription on the topic with:
//        Push endpoint = https://app.payablepilot.com/api/integrations/gmail/push
//        Authentication = "Enable authentication" → service account with
//        invoker rights. Pub/Sub will sign requests with an OIDC token.
//   4. Set env vars:
//        GMAIL_PUBSUB_TOPIC = projects/<project>/topics/gmail-push
//        GMAIL_PUSH_AUDIENCE = https://app.payablepilot.com/api/integrations/gmail/push
//        GMAIL_PUSH_VERIFICATION_MODE = "oidc" | "shared-secret" | "off"
//        GMAIL_PUSH_SHARED_SECRET = <only if using shared-secret mode>
//
// Each notification looks like:
//   {
//     "message": {
//       "data": "<base64 of {emailAddress, historyId}>",
//       "messageId": "...",
//       "publishTime": "..."
//     },
//     "subscription": "projects/.../subscriptions/..."
//   }
//
// Behavior:
//   - Decode the data payload to get { emailAddress, historyId }.
//   - Find the firm-level Gmail connection whose extra.email matches.
//   - Pull all new message IDs since the connection's last_history_id via
//     gmail.users.history.list.
//   - For each, insert into inbox_messages and enqueue process_inbound_email.
//   - Update last_history_id.
//
// If the connection's stored last_history_id is null (first notification
// after watch was started), we just record the new historyId without
// fetching — the next notification will bring real diffs.

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  buildGmailFromTokens,
  listHistorySinceId,
  getMessageAttachments,
  downloadAttachment,
} from "@/lib/integrations/gmail";
import { refreshFirmTokens } from "@/lib/integrations/tokens";
import { enqueue } from "@/lib/queue/enqueue";

type PubSubEnvelope = {
  message?: {
    data?: string;
    messageId?: string;
    publishTime?: string;
  };
  subscription?: string;
};

export async function POST(req: NextRequest) {
  // ------- Verification -------
  // Pub/Sub can sign requests with an OIDC JWT. Easiest path that works
  // without pulling in a JWT library: support a shared-secret query param
  // or header. For prod, we'd prefer to verify the OIDC token but the
  // OIDC path requires google-auth-library — adding here would balloon
  // the dependency. Shared-secret is fine to start; we can upgrade.
  const mode = process.env.GMAIL_PUSH_VERIFICATION_MODE ?? "shared-secret";
  if (mode !== "off") {
    const secret = process.env.GMAIL_PUSH_SHARED_SECRET;
    if (!secret) return new NextResponse("server_misconfigured", { status: 500 });
    const url = new URL(req.url);
    const provided = url.searchParams.get("secret") || (req.headers.get("authorization") ?? "").replace(/^Bearer /, "");
    if (provided !== secret) return new NextResponse("unauthorized", { status: 401 });
  }

  let envelope: PubSubEnvelope;
  try {
    envelope = (await req.json()) as PubSubEnvelope;
  } catch {
    return new NextResponse("invalid_json", { status: 400 });
  }

  const dataB64 = envelope.message?.data;
  if (!dataB64) {
    // Pub/Sub also expects a 200 for malformed messages so it doesn't
    // retry forever. Log and return ok.
    console.warn("[gmail-push] missing data payload");
    return NextResponse.json({ ok: true, skipped: "no_data" });
  }
  let parsed: { emailAddress?: string; historyId?: string | number };
  try {
    parsed = JSON.parse(Buffer.from(dataB64, "base64").toString("utf-8"));
  } catch (e) {
    console.warn("[gmail-push] could not decode data:", (e as Error).message);
    return NextResponse.json({ ok: true, skipped: "decode_failed" });
  }
  if (!parsed.emailAddress || !parsed.historyId) {
    return NextResponse.json({ ok: true, skipped: "incomplete" });
  }

  const admin = createSupabaseAdminClient();
  const { data: conn } = await admin
    .from("connections")
    .select("id, firm_id, access_token, refresh_token, expires_at, extra")
    .eq("provider", "gmail")
    .not("firm_id", "is", null)
    // jsonb match by stored email; we set extra.email at OAuth time.
    .filter("extra->>email", "eq", String(parsed.emailAddress).toLowerCase())
    .maybeSingle();

  if (!conn || !conn.firm_id) {
    console.warn(`[gmail-push] no connection for ${parsed.emailAddress}`);
    return NextResponse.json({ ok: true, skipped: "no_connection" });
  }

  const { data: sync } = await admin
    .from("gmail_sync_state")
    .select("last_history_id")
    .eq("connection_id", conn.id)
    .maybeSingle();
  const startHistoryId = sync?.last_history_id ?? null;

  // Build a Gmail client.
  const gmail = await buildGmailFromTokens(
    {
      accessToken: conn.access_token,
      refreshToken: conn.refresh_token ?? undefined,
      expiresAt: conn.expires_at ? new Date(conn.expires_at).getTime() : undefined,
      extra: (conn.extra ?? {}) as Record<string, string>,
    },
    async (refreshed) => {
      await refreshFirmTokens(conn.firm_id!, "gmail", refreshed);
    }
  );

  // First notification after watch start: nothing to diff. Just record.
  if (!startHistoryId) {
    await admin
      .from("gmail_sync_state")
      .upsert({
        connection_id: conn.id,
        last_history_id: String(parsed.historyId),
      });
    return NextResponse.json({ ok: true, initialized: true });
  }

  let history;
  try {
    history = await listHistorySinceId(gmail, String(startHistoryId));
  } catch (e) {
    console.error("[gmail-push] history.list failed:", e);
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }

  let inserted = 0;
  for (const messageId of history.newMessageIds) {
    try {
      const ok = await ingestOneMessage({ gmail, firmId: conn.firm_id, messageId });
      if (ok) inserted++;
    } catch (e) {
      console.error(`[gmail-push] ingest ${messageId} failed:`, e);
    }
  }

  await admin
    .from("gmail_sync_state")
    .upsert({
      connection_id: conn.id,
      last_history_id: history.latestHistoryId ?? String(parsed.historyId),
    });

  return NextResponse.json({ ok: true, inserted });
}

const ATTACHMENT_PREFETCH_MAX_BYTES = 1_500_000;

async function ingestOneMessage(opts: {
  gmail: Awaited<ReturnType<typeof buildGmailFromTokens>>;
  firmId: string;
  messageId: string;
}): Promise<boolean> {
  const admin = createSupabaseAdminClient();
  // Dedup
  const { data: existing } = await admin
    .from("inbox_messages")
    .select("id")
    .eq("firm_id", opts.firmId)
    .eq("message_id", opts.messageId)
    .maybeSingle();
  if (existing) return false;

  const detail = await opts.gmail.users.messages.get({
    userId: "me",
    id: opts.messageId,
    format: "full",
  });
  const headers = (detail.data.payload?.headers ?? []) as Array<{ name?: string | null; value?: string | null }>;
  const get = (name: string) =>
    headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value ?? "";
  const fromRaw = get("From");
  const fromHeader = parseFromAddress(fromRaw);
  const attachments = await getMessageAttachments(opts.messageId, opts.gmail);
  const firstAttachment = attachments[0];
  let attachmentForRouting: { base64: string; mimeType: string; filename: string } | null = null;
  if (firstAttachment && firstAttachment.size <= ATTACHMENT_PREFETCH_MAX_BYTES) {
    try {
      const dl = await downloadAttachment(opts.messageId, firstAttachment.attachmentId, opts.gmail);
      attachmentForRouting = {
        base64: dl.base64,
        mimeType: firstAttachment.mimeType,
        filename: firstAttachment.filename,
      };
    } catch (e) {
      console.error(`[gmail-push] attachment ${opts.messageId} download failed:`, e);
    }
  }

  const { data: row, error } = await admin
    .from("inbox_messages")
    .insert({
      firm_id: opts.firmId,
      source: "gmail",
      message_id: opts.messageId,
      from_email: fromHeader.email,
      from_name: fromHeader.name,
      subject: get("Subject") || null,
      received_at: get("Date") ? new Date(get("Date")).toISOString() : new Date().toISOString(),
      parsed_json: {
        snippet: detail.data.snippet ?? "",
        attachments: attachmentForRouting
          ? [attachmentForRouting]
          : attachments.map((a) => ({ filename: a.filename, mimeType: a.mimeType, size: a.size })),
      },
      routing_status: "unmatched",
    })
    .select("id")
    .single();
  if (error || !row) return false;

  await enqueue({
    firmId: opts.firmId,
    type: "process_inbound_email",
    payload: { inboxMessageId: row.id },
  });
  return true;
}

function parseFromAddress(raw: string): { email: string; name: string | null } {
  const m = raw.match(/^\s*(?:"?([^"<]+?)"?\s*)?<([^>]+)>\s*$/);
  if (m) return { name: m[1]?.trim() || null, email: m[2].trim().toLowerCase() };
  return { name: null, email: raw.trim().toLowerCase() };
}
