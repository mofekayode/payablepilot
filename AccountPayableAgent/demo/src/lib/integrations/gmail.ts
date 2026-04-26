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
export async function getGmailClient(): Promise<gmail_v1.Gmail | null> {
  const stored = await getTokens("gmail");
  if (!stored) return null;
  const oauth = createOAuthClient();
  oauth.setCredentials({
    access_token: stored.accessToken,
    refresh_token: stored.refreshToken,
    expiry_date: stored.expiresAt,
  });
  // Auto-refresh: if the token is stale, get a new one and persist.
  if (stored.expiresAt && stored.expiresAt - 60_000 < Date.now() && stored.refreshToken) {
    const { credentials } = await oauth.refreshAccessToken();
    await setTokens("gmail", {
      accessToken: credentials.access_token ?? stored.accessToken,
      refreshToken: credentials.refresh_token ?? stored.refreshToken,
      expiresAt: credentials.expiry_date ?? undefined,
    });
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
};

// List recent messages in the AP inbox that look like invoices (have attachments).
export async function listInvoiceMessages(maxResults = 25): Promise<GmailMessageSummary[]> {
  const gmail = await getGmailClient();
  if (!gmail) throw new Error("Gmail is not connected.");

  // Heuristic: anything in INBOX with an attachment from the last 7 days.
  const list = await gmail.users.messages.list({
    userId: "me",
    q: "has:attachment newer_than:7d",
    maxResults,
  });

  const messages = list.data.messages ?? [];
  const summaries = await Promise.all(
    messages.map(async (m) => {
      const detail = await gmail.users.messages.get({
        userId: "me",
        id: m.id!,
        format: "metadata",
        metadataHeaders: ["From", "Subject", "Date"],
      });
      const headers = (detail.data.payload?.headers ?? []) as Array<{ name?: string | null; value?: string | null }>;
      const get = (name: string) => headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value ?? "";
      const attachmentNames = collectAttachmentNames(detail.data.payload);
      return {
        id: detail.data.id ?? "",
        threadId: detail.data.threadId ?? "",
        from: get("From"),
        subject: get("Subject"),
        receivedAt: get("Date"),
        snippet: detail.data.snippet ?? "",
        hasAttachments: attachmentNames.length > 0,
        attachmentNames,
      };
    })
  );

  // Filter to messages that actually have attachments (the search hint isn't 100%).
  return summaries.filter((s) => s.hasAttachments);
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
