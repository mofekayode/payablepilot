// Mints a short, URL/email-safe alias for a business's inbound forwarding
// address: inbox+<alias>@inbound.payablepilot.com.
// 8 chars from a base32-ish alphabet (no ambiguous 0/O/1/I) → ~10^12 space.

const ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";

export function generateInboxAlias(): string {
  const bytes = new Uint8Array(8);
  if (typeof globalThis.crypto?.getRandomValues === "function") {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  let out = "";
  for (let i = 0; i < bytes.length; i++) {
    out += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return out;
}

export function inboundDomain(): string {
  return process.env.NEXT_PUBLIC_INBOUND_DOMAIN || "inbound.payablepilot.com";
}

export function fullInboxAddress(alias: string): string {
  return `inbox+${alias}@${inboundDomain()}`;
}
