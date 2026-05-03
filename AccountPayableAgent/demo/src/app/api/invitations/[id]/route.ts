// Revoke a pending invitation.

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit/log";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return new NextResponse("not_authenticated", { status: 401 });

  const { id } = await params;

  const supabase = await createSupabaseServerClient();
  const { data: invite, error } = await supabase
    .from("business_invitations")
    .select("id, firm_id, business_id, email, role, accepted_at, revoked_at")
    .eq("id", id)
    .maybeSingle();
  if (error || !invite) return new NextResponse("not_found", { status: 404 });
  if (invite.accepted_at) return new NextResponse("already_accepted", { status: 409 });
  if (invite.revoked_at) return new NextResponse("already_revoked", { status: 409 });

  const { data: firmMember } = await supabase
    .from("firm_members")
    .select("user_id")
    .eq("firm_id", invite.firm_id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!firmMember) return new NextResponse("forbidden", { status: 403 });

  const admin = createSupabaseAdminClient();
  const { error: updateError } = await admin
    .from("business_invitations")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", id);
  if (updateError) return new NextResponse(updateError.message, { status: 500 });

  await logAudit({
    action: "invite.revoke",
    firmId: invite.firm_id,
    businessId: invite.business_id,
    actorUserId: user.id,
    details: { inviteId: id, email: invite.email, role: invite.role },
  });

  return NextResponse.json({ ok: true });
}
