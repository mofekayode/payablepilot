import { NextRequest, NextResponse } from "next/server";
import { exchangeCode } from "@/lib/integrations/gmail";
import { setTokens } from "@/lib/integrations/tokens";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const expectedState = req.cookies.get("pp_gmail_state")?.value;

  if (!code) return NextResponse.redirect(new URL("/settings?gmail=error&reason=missing_code", req.url));
  if (!state || state !== expectedState) {
    return NextResponse.redirect(new URL("/settings?gmail=error&reason=state_mismatch", req.url));
  }

  try {
    const tokens = await exchangeCode(code);
    await setTokens("gmail", tokens);
    const res = NextResponse.redirect(new URL("/settings?gmail=connected", req.url));
    res.cookies.delete("pp_gmail_state");
    return res;
  } catch (e) {
    const msg = encodeURIComponent((e as Error).message);
    return NextResponse.redirect(new URL(`/settings?gmail=error&reason=${msg}`, req.url));
  }
}
