// Gmail integration: OAuth2 client + helpers to list invoice-bearing messages.
// Requires env vars: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI.
// See .env.example.

import { google, Auth, gmail_v1 } from "googleapis";
import { getTokens, setTokens, type StoredTokens } from "./tokens";

const SCOPES = [
  // Read-only access to messages — we don't modify or send anything.
  "https://www.googleapis.com/auth/gmail.readonly",
];

function requireEnv(): { clientId: string; clientSecret: string; redirectUri: string } {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;
  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error(
      "Gmail integration not configured. Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REDIRECT_URI."
    );
  }
  return { clientId, clientSecret, redirectUri };
}

export function createOAuthClient(): Auth.OAuth2Client {
  const env = requireEnv();
  return new google.auth.OAuth2(env.clientId, env.clientSecret, env.redirectUri);
}

export function authUrl(state: string): string {
  return createOAuthClient().generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: SCOPES,
    state,
  });
}

export async function exchangeCode(code: string): Promise<StoredTokens> {
  const client = createOAuthClient();
  const { tokens } = await client.getToken(code);
  return {
    accessToken: tokens.access_token ?? "",
    refreshToken: tokens.refresh_token ?? undefined,
    expiresAt: tokens.expiry_date ?? undefined,
  };
}

// Build an authed Gmail client, refreshing the access token if expired.
// Used inside a request context (active business resolved from cookie).
export async function getGmailClient(): Promise<gmail_v1.Gmail | null> {
  const stored = await getTokens("gmail");
  if (!stored) return null;
  return buildGmailFromTokens(stored, async (refreshed) => {
    await setTokens("gmail", refreshed);
  });
}

// Background-safe variant: build a client from explicit tokens. The
// `persist` callback is called with the refreshed token so the caller can
// write it back wherever it lives (firm-level or business-level table).
export async function buildGmailFromTokens(
  stored: StoredTokens,
  persist?: (refreshed: StoredTokens) => Promise<void>
): Promise<gmail_v1.Gmail> {
  const oauth = createOAuthClient();
  oauth.setCredentials({
    access_token: stored.accessToken,
    refresh_token: stored.refreshToken,
    expiry_date: stored.expiresAt,
  });
  if (stored.expiresAt && stored.expiresAt - 60_000 < Date.now() && stored.refreshToken) {
    const { credentials } = await oauth.refreshAccessToken();
    const refreshed: StoredTokens = {
      accessToken: credentials.access_token ?? stored.accessToken,
      refreshToken: credentials.refresh_token ?? stored.refreshToken,
      expiresAt: credentials.expiry_date ?? undefined,
      extra: stored.extra,
    };
    if (persist) await persist(refreshed);
  }
  return google.gmail({ version: "v1", auth: oauth });
}

export type GmailMessageSummary = {
  id: string;
  threadId: string;
  from: string;
  subject: string;
  receivedAt: string;
  snippet: string;
  hasAttachments: boolean;
  attachmentNames: string[];
  attachments: Array<{ filename: string; mimeType: string; attachmentId: string; size: number }>;
};

// List recent messages in the AP inbox that look like invoices (have attachments).
// `client` lets the caller pass its own Gmail client (used by the firm-level
// background poller). When omitted we fall back to the request-scoped client.
export async function listInvoiceMessages(
  opts: { maxResults?: number; days?: number; query?: string; client?: gmail_v1.Gmail } = {}
): Promise<GmailMessageSummary[]> {
  const { maxResults = 25, days = 30, query } = opts;
  const gmail = opts.client ?? (await getGmailClient());
  if (!gmail) throw new Error("Gmail is not connected.");

  // Default heuristic: invoice-flavored attachments only. We don't want to surface
  // USPS Informed Delivery mail, calendar invites, generic "we sent you a thing"
  // emails, or anything in the Promotions category. Caller can pass `query` to
  // bypass this entirely (used by /api/integrations/gmail/messages?q=).
  const q =
    query ??
    `has:attachment newer_than:${days}d (invoice OR receipt OR bill OR statement OR "amount due" OR "payment due" OR "order confirmation") -filename:ics -category:promotions`;
  const list = await gmail.users.messages.list({
    userId: "me",
    q,
    maxResults,
  });

  const messages = list.data.messages ?? [];
  const summaries = await Promise.all(
    messages.map(async (m) => {
      // `full` is required so message parts (and therefore filenames) come back.
      // `metadata` would strip the parts tree and the attachment post-filter would always fail.
      const detail = await gmail.users.messages.get({
        userId: "me",
        id: m.id!,
        format: "full",
      });
      const headers = (detail.data.payload?.headers ?? []) as Array<{ name?: string | null; value?: string | null }>;
      const get = (name: string) => headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value ?? "";
      const attachments = listAttachmentParts(detail.data.payload);
      const attachmentNames = attachments.map((a) => a.filename);
      return {
        id: detail.data.id ?? "",
        threadId: detail.data.threadId ?? "",
        from: get("From"),
        subject: get("Subject"),
        receivedAt: get("Date"),
        snippet: detail.data.snippet ?? "",
        hasAttachments: attachments.length > 0,
        attachmentNames,
        attachments,
      };
    })
  );

  // Trust Gmail's `has:attachment` operator if the caller used the default query —
  // otherwise some inline-image messages slip through, but they're harmless.
  return summaries;
}

function collectAttachmentNames(payload: gmail_v1.Schema$MessagePart | undefined): string[] {
  if (!payload) return [];
  const out: string[] = [];
  const visit = (part: gmail_v1.Schema$MessagePart) => {
    if (part.filename && part.filename.length > 0) out.push(part.filename);
    (part.parts ?? []).forEach(visit);
  };
  visit(payload);
  return out;
}

export type GmailAttachment = {
  filename: string;
  mimeType: string;
  attachmentId: string;
  size: number;
};

// Walks the payload tree and returns metadata for every part with a non-empty filename.
export function listAttachmentParts(payload: gmail_v1.Schema$MessagePart | undefined): GmailAttachment[] {
  if (!payload) return [];
  const out: GmailAttachment[] = [];
  const visit = (part: gmail_v1.Schema$MessagePart) => {
    if (part.filename && part.body?.attachmentId) {
      out.push({
        filename: part.filename,
        mimeType: part.mimeType ?? "application/octet-stream",
        attachmentId: part.body.attachmentId,
        size: part.body.size ?? 0,
      });
    }
    (part.parts ?? []).forEach(visit);
  };
  visit(payload);
  return out;
}

// Returns { attachments, mimeType } for a message. Includes the actual attachment IDs needed to download.
export async function getMessageAttachments(
  messageId: string,
  client?: gmail_v1.Gmail
): Promise<GmailAttachment[]> {
  const gmail = client ?? (await getGmailClient());
  if (!gmail) throw new Error("Gmail is not connected.");
  const detail = await gmail.users.messages.get({ userId: "me", id: messageId, format: "full" });
  return listAttachmentParts(detail.data.payload);
}

// Downloads a single Gmail attachment as base64 (Gmail returns URL-safe base64 — convert to standard).
export async function downloadAttachment(
  messageId: string,
  attachmentId: string,
  client?: gmail_v1.Gmail
): Promise<{ base64: string; bytes: number }> {
  const gmail = client ?? (await getGmailClient());
  if (!gmail) throw new Error("Gmail is not connected.");
  const res = await gmail.users.messages.attachments.get({ userId: "me", messageId, id: attachmentId });
  const urlSafe = res.data.data ?? "";
  // Gmail uses url-safe base64; convert to standard base64 so Anthropic + atob handle it.
  const base64 = urlSafe.replace(/-/g, "+").replace(/_/g, "/");
  const bytes = res.data.size ?? 0;
  return { base64, bytes };
}

// ----------------- Push notifications (users.watch) -----------------

// Begins a watch on a mailbox so Gmail will publish a notification to the
// configured Pub/Sub topic on every mailbox change. Returns the historyId
// that establishes the starting point for incremental sync.
//
// Topic format: "projects/<gcp-project>/topics/<topic-name>". Caller is
// responsible for passing the right topic (read from env in the route).
export async function startWatch(
  client: gmail_v1.Gmail,
  topicName: string,
  labelIds: string[] = ["INBOX"]
): Promise<{ historyId: string; expiration: number }> {
  const res = await client.users.watch({
    userId: "me",
    requestBody: { topicName, labelIds, labelFilterBehavior: "INCLUDE" },
  });
  return {
    historyId: String(res.data.historyId ?? ""),
    expiration: Number(res.data.expiration ?? 0),
  };
}

export async function stopWatch(client: gmail_v1.Gmail): Promise<void> {
  await client.users.stop({ userId: "me" });
}

// Pulls all message IDs added since `startHistoryId`. Used by the Pub/Sub
// webhook to discover what's new without fetching the whole inbox.
export async function listHistorySinceId(
  client: gmail_v1.Gmail,
  startHistoryId: string
): Promise<{ newMessageIds: string[]; latestHistoryId: string | null }> {
  const ids = new Set<string>();
  let pageToken: string | undefined;
  let latest: string | null = startHistoryId;
  do {
    const res = await client.users.history.list({
      userId: "me",
      startHistoryId,
      historyTypes: ["messageAdded"],
      pageToken,
    });
    if (res.data.historyId) latest = String(res.data.historyId);
    for (const h of res.data.history ?? []) {
      for (const m of h.messagesAdded ?? []) {
        if (m.message?.id) ids.add(m.message.id);
      }
    }
    pageToken = res.data.nextPageToken ?? undefined;
  } while (pageToken);
  return { newMessageIds: Array.from(ids), latestHistoryId: latest };
}

// Returns the user's primary email address — used to map a Pub/Sub
// notification (which carries emailAddress) back to a `connections` row.
export async function getProfileEmail(client: gmail_v1.Gmail): Promise<string | null> {
  const res = await client.users.getProfile({ userId: "me" });
  return res.data.emailAddress ?? null;
}
