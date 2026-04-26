// Cookie-based token storage. Demo-grade.
// For production, persist in a database keyed by user/org and rotate on refresh.

import { cookies } from "next/headers";

export type StoredTokens = {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number; // epoch ms
  // Provider-specific extras (e.g. realmId for QBO)
  extra?: Record<string, string>;
};

const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  // 30 days — refresh tokens last longer but the cookie just needs to outlive the session.
  maxAge: 60 * 60 * 24 * 30,
};

export async function getTokens(provider: "gmail" | "qbo"): Promise<StoredTokens | null> {
  const c = await cookies();
  const raw = c.get(`pp_${provider}`)?.value;
  if (!raw) return null;
  try {
    return JSON.parse(Buffer.from(raw, "base64").toString("utf-8"));
  } catch {
    return null;
  }
}

export async function setTokens(provider: "gmail" | "qbo", tokens: StoredTokens) {
  const c = await cookies();
  const encoded = Buffer.from(JSON.stringify(tokens)).toString("base64");
  c.set(`pp_${provider}`, encoded, COOKIE_OPTS);
}

export async function clearTokens(provider: "gmail" | "qbo") {
  const c = await cookies();
  c.delete(`pp_${provider}`);
}

export async function isConnected(provider: "gmail" | "qbo"): Promise<boolean> {
  return (await getTokens(provider)) !== null;
}
