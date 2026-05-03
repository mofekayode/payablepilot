// Audit log helper. Server-only — uses the service role client to bypass RLS
// because audit rows must be writable from any authed action.
//
// Usage:
//   await logAudit({ firmId, businessId, action: 'business.create', details: { name } });
// All fields except `action` are optional; pass what you have.

import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type AuditAction =
  | "firm.create"
  | "business.create"
  | "business.switch"
  | "connection.set"
  | "connection.clear"
  | "invite.create"
  | "invite.accept"
  | "invite.revoke"
  | "member.role_change"
  | "user.signin";

export async function logAudit(opts: {
  action: AuditAction | string;
  firmId?: string | null;
  businessId?: string | null;
  actorUserId?: string | null;
  details?: Record<string, unknown>;
}): Promise<void> {
  try {
    const admin = createSupabaseAdminClient();
    await admin.from("audit_log").insert({
      action: opts.action,
      firm_id: opts.firmId ?? null,
      business_id: opts.businessId ?? null,
      actor_user_id: opts.actorUserId ?? null,
      details: opts.details ?? {},
    });
  } catch (e) {
    // Audit logging must never block the actual action.
    console.error("[audit] failed:", e);
  }
}
