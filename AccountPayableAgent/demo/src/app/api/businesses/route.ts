// List the user's accessible businesses, or create a new one under their firm.

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, listAccessibleBusinesses } from "@/lib/auth/current";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { generateInboxAlias } from "@/lib/businesses/alias";
import { logAudit } from "@/lib/audit/log";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return new NextResponse("not_authenticated", { status: 401 });
  const businesses = await listAccessibleBusinesses();
  return NextResponse.json({ businesses });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return new NextResponse("not_authenticated", { status: 401 });

  let body: { name?: string; legalName?: string; ein?: string };
  try {
    body = await req.json();
  } catch {
    return new NextResponse("invalid_json", { status: 400 });
  }
  const name = (body.name ?? "").trim();
  if (!name) return new NextResponse("name_required", { status: 400 });

  const supabase = await createSupabaseServerClient();
  // Find the firm this user owns/belongs to.
  const { data: membership } = await supabase
    .from("firm_members")
    .select("firm_id")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (!membership?.firm_id) return new NextResponse("no_firm", { status: 400 });

  const admin = createSupabaseAdminClient();

  // Generate a unique alias. Retry a couple times on collision (extremely rare).
  let alias = generateInboxAlias();
  for (let attempt = 0; attempt < 3; attempt++) {
    const { data, error } = await admin
      .from("businesses")
      .insert({
        firm_id: membership.firm_id,
        name,
        legal_name: body.legalName?.trim() || null,
        ein: body.ein?.trim() || null,
        inbox_alias: alias,
      })
      .select("*")
      .single();

    if (data) {
      // Auto-add the creator as a business member.
      await admin.from("business_members").insert({
        business_id: data.id,
        user_id: user.id,
        role: "bookkeeper",
      });
      // Set as the active business + persist as last-business pref.
      const res = NextResponse.json({ business: data });
      res.cookies.set("pp_active_business", data.id, {
        httpOnly: false, // readable by client to render the switcher; not sensitive.
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 365,
      });
      await admin.from("user_prefs").upsert({ user_id: user.id, last_business_id: data.id });
      await logAudit({
        action: "business.create",
        firmId: membership.firm_id,
        businessId: data.id,
        actorUserId: user.id,
        details: { name, legalName: body.legalName ?? null, ein: body.ein ?? null, alias },
      });
      return res;
    }
    if (error?.code === "23505") {
      // unique_violation on inbox_alias — retry with a fresh one.
      alias = generateInboxAlias();
      continue;
    }
    return new NextResponse(error?.message ?? "insert_failed", { status: 500 });
  }
  return new NextResponse("alias_collision_retry_exhausted", { status: 500 });
}
