import { NextRequest, NextResponse } from "next/server";
import { exchangeCode } from "@/lib/integrations/qbo";
import { setTokensForBusiness } from "@/lib/integrations/tokens";
import { appendFlash } from "@/lib/integrations/return-to";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const realmId = url.searchParams.get("realmId");
  const state = url.searchParams.get("state");
  const expectedState = req.cookies.get("pp_qbo_state")?.value;
  const businessId = req.cookies.get("pp_qbo_business")?.value;
  const returnTo = req.cookies.get("pp_qbo_return")?.value || "/settings";

  function back(params: Record<string, string>) {
    const res = NextResponse.redirect(new URL(appendFlash(returnTo, params), req.url));
    res.cookies.delete("pp_qbo_state");
    res.cookies.delete("pp_qbo_business");
    res.cookies.delete("pp_qbo_return");
    return res;
  }

  if (!code || !realmId) return back({ qbo: "error", reason: "missing_params" });
  if (!state || state !== expectedState) return back({ qbo: "error", reason: "state_mismatch" });
  if (!businessId) return back({ qbo: "error", reason: "missing_business" });

  try {
    const tokens = await exchangeCode(code, realmId);
    await setTokensForBusiness(businessId, "qbo", tokens);
    return back({ qbo: "connected" });
  } catch (e) {
    return back({ qbo: "error", reason: encodeURIComponent((e as Error).message) });
  }
}
