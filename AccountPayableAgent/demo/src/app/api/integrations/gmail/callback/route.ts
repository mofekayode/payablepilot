import { NextRequest, NextResponse } from "next/server";
import { exchangeCode } from "@/lib/integrations/gmail";
import { setTokensForBusiness } from "@/lib/integrations/tokens";
import { appendFlash } from "@/lib/integrations/return-to";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const expectedState = req.cookies.get("pp_gmail_state")?.value;
  const businessId = req.cookies.get("pp_gmail_business")?.value;
  const returnTo = req.cookies.get("pp_gmail_return")?.value || "/settings";

  function back(params: Record<string, string>) {
    const res = NextResponse.redirect(new URL(appendFlash(returnTo, params), req.url));
    res.cookies.delete("pp_gmail_state");
    res.cookies.delete("pp_gmail_business");
    res.cookies.delete("pp_gmail_return");
    return res;
  }

  if (!code) return back({ gmail: "error", reason: "missing_code" });
  if (!state || state !== expectedState) return back({ gmail: "error", reason: "state_mismatch" });
  if (!businessId) return back({ gmail: "error", reason: "missing_business" });

  try {
    const tokens = await exchangeCode(code);
    await setTokensForBusiness(businessId, "gmail", tokens);
    return back({ gmail: "connected" });
  } catch (e) {
    return back({ gmail: "error", reason: encodeURIComponent((e as Error).message) });
  }
}
