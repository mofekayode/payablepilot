// Generates a long, URL-safe random token for invite links. ~22 chars of
// base64url ≈ 132 bits of entropy — comfortably unguessable.

import { randomBytes } from "crypto";

export function generateInviteToken(): string {
  return randomBytes(24).toString("base64url");
}

export function inviteUrl(origin: string, token: string): string {
  return `${origin}/invite/${encodeURIComponent(token)}`;
}
