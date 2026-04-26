import { NextRequest, NextResponse } from "next/server";
import { exchangeCode } from "@/lib/integrations/qbo";
import { setTokens } from "@/lib/integrations/tokens";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const realmId = url.searchParams.get("realmId");
  const state = url.searchParams.get("state");
  const expectedState = req.cookies.get("pp_qbo_state")?.value;

  if (!code || !realmId) {
    return NextResponse.redirect(new URL("/settings?qbo=error&reason=missing_params", req.url));
  }
  if (!state || state !== expectedState) {
    return NextResponse.redirect(new URL("/settings?qbo=error&reason=state_mismatch", req.url));
  }

  try {
    const tokens = await exchangeCode(code, realmId);
    await setTokens("qbo", tokens);
    const res = NextResponse.redirect(new URL("/settings?qbo=connected", req.url));
    res.cookies.delete("pp_qbo_state");
    return res;
  } catch (e) {
    const msg = encodeURIComponent((e as Error).message);
    return NextResponse.redirect(new URL(`/settings?qbo=error&reason=${msg}`, req.url));
  }
}
