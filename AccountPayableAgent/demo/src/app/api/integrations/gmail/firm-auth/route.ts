// Firm-level Gmail OAuth init.
//
// The bookkeeper connects ONE Gmail mailbox at the firm level. Inbound
// messages from that mailbox flow through the routing engine, which
// assigns each one to the right business workspace.

import { NextRequest, NextResponse } from "next/server";
import { authUrl } from "@/lib/integrations/gmail";
import { randomBytes } from "crypto";
import { getCurrentUser } from "@/lib/auth/current";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { resolveReturnTo } from "@/lib/integrations/return-to";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });

    // Find the firm this user owns/belongs to.
    const supabase = await createSupabaseServerClient();
    const { data: membership } = await supabase
      .from("firm_members")
      .select("firm_id")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (!membership?.firm_id) {
      return NextResponse.json({ error: "no_firm" }, { status: 400 });
    }

    const state = randomBytes(16).toString("hex");
    const returnTo = resolveReturnTo(req);
    const url = authUrl(state);
    const res = NextResponse.redirect(url);
    const opts = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax" as const,
      path: "/",
      maxAge: 600,
    };
    res.cookies.set("pp_gmail_state", state, opts);
    res.cookies.set("pp_gmail_firm", membership.firm_id, opts);
    res.cookies.set("pp_gmail_return", returnTo, opts);
    return res;
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
