// List pending invitations for the active business, or create a new one.
// Only firm members (bookkeepers) may create invitations.

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, requireActiveBusinessId } from "@/lib/auth/current";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { generateInviteToken, inviteUrl } from "@/lib/invitations/tokens";
import { logAudit } from "@/lib/audit/log";

type Role = "admin" | "viewer" | "bookkeeper";

function isValidEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return new NextResponse("not_authenticated", { status: 401 });

  const businessId = await requireActiveBusinessId().catch(() => null);
  if (!businessId) return NextResponse.json({ invitations: [] });

  // RLS limits visibility to firm/business members.
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("business_invitations")
    .select("id, email, role, expires_at, accepted_at, revoked_at, created_at, token")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false });
  if (error) return new NextResponse(error.message, { status: 500 });

  return NextResponse.json({ invitations: data ?? [] });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return new NextResponse("not_authenticated", { status: 401 });

  let body: { email?: string; role?: Role };
  try {
    body = await req.json();
  } catch {
    return new NextResponse("invalid_json", { status: 400 });
  }
  const email = (body.email ?? "").trim().toLowerCase();
  const role: Role = body.role === "viewer" ? "viewer" : body.role === "bookkeeper" ? "bookkeeper" : "admin";
  if (!isValidEmail(email)) return new NextResponse("invalid_email", { status: 400 });

  const businessId = await requireActiveBusinessId().catch(() => null);
  if (!businessId) return new NextResponse("no_active_business", { status: 400 });

  // Confirm the caller is a firm member (i.e. a bookkeeper) — clients can
  // see invitations via RLS but shouldn't be able to create them. The
  // server-side check is needed because we use the admin client to write.
  const supabase = await createSupabaseServerClient();
  const { data: bizRow, error: bizErr } = await supabase
    .from("businesses")
    .select("firm_id")
    .eq("id", businessId)
    .maybeSingle();
  if (bizErr || !bizRow) return new NextResponse("forbidden", { status: 403 });

  const { data: firmMember } = await supabase
    .from("firm_members")
    .select("user_id")
    .eq("firm_id", bizRow.firm_id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!firmMember) return new NextResponse("forbidden", { status: 403 });

  const admin = createSupabaseAdminClient();
  const token = generateInviteToken();

  const { data: invite, error: insertError } = await admin
    .from("business_invitations")
    .insert({
      business_id: businessId,
      firm_id: bizRow.firm_id,
      email,
      role,
      token,
      invited_by: user.id,
    })
    .select("*")
    .single();

  if (insertError) {
    if (insertError.code === "23505") {
      return new NextResponse("already_invited", { status: 409 });
    }
    return new NextResponse(insertError.message, { status: 500 });
  }

  await logAudit({
    action: "invite.create",
    firmId: bizRow.firm_id,
    businessId,
    actorUserId: user.id,
    details: { email, role, inviteId: invite.id },
  });

  const origin = process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin;
  const url = inviteUrl(origin, token);

  return NextResponse.json({ invitation: invite, url });
}
