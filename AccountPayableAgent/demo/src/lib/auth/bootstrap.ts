// Creates a firm row + firm_members row for a freshly signed-up user.
// Idempotent — if the user already has a firm, returns the existing one.

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { logAudit } from "@/lib/audit/log";
import type { Firm } from "@/lib/supabase/types";

export async function bootstrapFirmForUser(opts: {
  userId: string;
  firmName: string;
}): Promise<Firm> {
  const admin = createSupabaseAdminClient();

  // If the user already owns a firm, return it.
  const { data: existing } = await admin
    .from("firm_members")
    .select("firm_id, firms(*)")
    .eq("user_id", opts.userId)
    .eq("role", "owner")
    .maybeSingle();
  if (existing?.firms) {
    return existing.firms as unknown as Firm;
  }

  const { data: firm, error: firmError } = await admin
    .from("firms")
    .insert({ name: opts.firmName.trim() || "My firm" })
    .select("*")
    .single();
  if (firmError || !firm) {
    throw new Error(`Could not create firm: ${firmError?.message ?? "unknown"}`);
  }

  const { error: memberError } = await admin.from("firm_members").insert({
    firm_id: firm.id,
    user_id: opts.userId,
    role: "owner",
  });
  if (memberError) {
    throw new Error(`Could not link user to firm: ${memberError.message}`);
  }

  await logAudit({
    action: "firm.create",
    firmId: firm.id,
    actorUserId: opts.userId,
    details: { name: firm.name },
  });

  return firm as Firm;
}
