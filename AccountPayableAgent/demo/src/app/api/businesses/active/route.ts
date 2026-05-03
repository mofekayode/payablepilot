// Switch the active business for the current session.

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit/log";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return new NextResponse("not_authenticated", { status: 401 });

  let body: { businessId?: string };
  try {
    body = await req.json();
  } catch {
    return new NextResponse("invalid_json", { status: 400 });
  }
  const businessId = body.businessId;
  if (!businessId) return new NextResponse("businessId_required", { status: 400 });

  // RLS enforces access — if the user can't see the row, we won't get one.
  const supabase = await createSupabaseServerClient();
  const { data: business, error } = await supabase
    .from("businesses")
    .select("id")
    .eq("id", businessId)
    .maybeSingle();
  if (error) return new NextResponse(error.message, { status: 500 });
  if (!business) return new NextResponse("forbidden", { status: 403 });

  const res = NextResponse.json({ ok: true, businessId });
  res.cookies.set("pp_active_business", businessId, {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  // Persist as last-business pref. Use the user's RLS session so we don't
  // need the service role for a simple self-write.
  await supabase.from("user_prefs").upsert({ user_id: user.id, last_business_id: businessId });
  await logAudit({
    action: "business.switch",
    businessId,
    actorUserId: user.id,
  });
  return res;
}
