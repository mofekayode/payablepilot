// Called by the /invite/[token] page once the user is signed in.
// Adds the user to business_members (or firm_members if role=bookkeeper)
// and marks the invitation accepted.

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { logAudit } from "@/lib/audit/log";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return new NextResponse("not_authenticated", { status: 401 });

  let body: { token?: string };
  try {
    body = await req.json();
  } catch {
    return new NextResponse("invalid_json", { status: 400 });
  }
  const token = body.token?.trim();
  if (!token) return new NextResponse("token_required", { status: 400 });

  const admin = createSupabaseAdminClient();
  const { data: invite, error: fetchErr } = await admin
    .from("business_invitations")
    .select("*")
    .eq("token", token)
    .maybeSingle();
  if (fetchErr) return new NextResponse(fetchErr.message, { status: 500 });
  if (!invite) return new NextResponse("not_found", { status: 404 });
  if (invite.accepted_at) return new NextResponse("already_accepted", { status: 409 });
  if (invite.revoked_at) return new NextResponse("revoked", { status: 410 });
  if (new Date(invite.expires_at).getTime() < Date.now()) {
    return new NextResponse("expired", { status: 410 });
  }
  if ((user.email ?? "").toLowerCase() !== (invite.email ?? "").toLowerCase()) {
    return new NextResponse("email_mismatch", { status: 403 });
  }

  // Map invitation.role → business_members.role (and optionally firm_members).
  if (invite.role === "bookkeeper") {
    await admin.from("firm_members").upsert(
      {
        firm_id: invite.firm_id,
        user_id: user.id,
        role: "bookkeeper",
      },
      { onConflict: "firm_id,user_id" }
    );
  }
  const memberRole = invite.role === "viewer" ? "client_viewer" : invite.role === "admin" ? "client_owner" : "bookkeeper";
  await admin.from("business_members").upsert(
    {
      business_id: invite.business_id,
      user_id: user.id,
      role: memberRole,
    },
    { onConflict: "business_id,user_id" }
  );

  await admin
    .from("business_invitations")
    .update({ accepted_at: new Date().toISOString(), accepted_by: user.id })
    .eq("id", invite.id);

  await admin
    .from("user_prefs")
    .upsert({ user_id: user.id, last_business_id: invite.business_id });

  await logAudit({
    action: "invite.accept",
    firmId: invite.firm_id,
    businessId: invite.business_id,
    actorUserId: user.id,
    details: { inviteId: invite.id, role: invite.role },
  });

  const res = NextResponse.json({ ok: true, businessId: invite.business_id });
  res.cookies.set("pp_active_business", invite.business_id, {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return res;
}
