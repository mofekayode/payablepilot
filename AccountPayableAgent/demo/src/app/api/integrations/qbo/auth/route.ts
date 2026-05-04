import { NextRequest, NextResponse } from "next/server";
import { authUrl } from "@/lib/integrations/qbo";
import { randomBytes } from "crypto";
import { requireActiveBusinessId } from "@/lib/auth/current";
import { resolveReturnTo } from "@/lib/integrations/return-to";

export async function GET(req: NextRequest) {
  try {
    const businessId = await requireActiveBusinessId();
    const state = randomBytes(16).toString("hex");
    const returnTo = resolveReturnTo(req);
    const url = await authUrl(state);
    const res = NextResponse.redirect(url);
    const opts = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax" as const,
      path: "/",
      maxAge: 600,
    };
    res.cookies.set("pp_qbo_state", state, opts);
    res.cookies.set("pp_qbo_business", businessId, opts);
    res.cookies.set("pp_qbo_return", returnTo, opts);
    return res;
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
