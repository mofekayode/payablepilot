import { NextResponse } from "next/server";
import { authUrl } from "@/lib/integrations/gmail";
import { randomBytes } from "crypto";

export async function GET() {
  try {
    const state = randomBytes(16).toString("hex");
    // In production, persist `state` server-side and verify on callback to defeat CSRF.
    const url = authUrl(state);
    const res = NextResponse.redirect(url);
    res.cookies.set("pp_gmail_state", state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 600,
    });
    return res;
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
