// Intuit Disconnect URL.
//
// Intuit calls this endpoint server-to-server when a user disconnects
// PayablePilot from inside QuickBooks Online ("Apps → My Apps → Disconnect").
// Intuit sends a request (typically GET) with the realmId of the company
// being disconnected; our job is to find the matching connection and
// remove the OAuth tokens so we stop trying to read/write that QBO file.
//
// This is NOT a UI page — there's no signed-in user. We use the service
// role client and look up the connection by extra.realmId.
//
// Always returns 200 so Intuit doesn't retry forever even if the
// connection wasn't found (e.g. the user already disconnected from our
// side). The worst case of an unauthenticated caller hitting this with
// a guessed realmId is that we delete a token the user can simply
// re-OAuth — same severity as them clicking Disconnect themselves.

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { logAudit } from "@/lib/audit/log";

async function handle(req: NextRequest) {
  const url = new URL(req.url);
  const realmId = url.searchParams.get("realmId");

  if (!realmId) {
    return NextResponse.json({ ok: true, skipped: "no_realmId" });
  }

  try {
    const admin = createSupabaseAdminClient();
    const { data: rows, error } = await admin
      .from("connections")
      .select("id, business_id, firm_id")
      .eq("provider", "qbo")
      .eq("extra->>realmId", realmId);
    if (error) {
      console.error("[intuit-disconnect] lookup failed:", error.message);
      return NextResponse.json({ ok: true, error: error.message });
    }
    if (!rows || rows.length === 0) {
      return NextResponse.json({ ok: true, skipped: "no_match" });
    }
    const ids = rows.map((r) => r.id);
    const { error: delError } = await admin.from("connections").delete().in("id", ids);
    if (delError) {
      console.error("[intuit-disconnect] delete failed:", delError.message);
      return NextResponse.json({ ok: true, error: delError.message });
    }
    for (const r of rows) {
      await logAudit({
        action: "connection.clear",
        firmId: r.firm_id ?? null,
        businessId: r.business_id ?? null,
        actorUserId: null,
        details: { provider: "qbo", source: "intuit_disconnect", realmId },
      });
    }
    return NextResponse.json({ ok: true, removed: ids.length });
  } catch (e) {
    console.error("[intuit-disconnect]", e);
    // Always 200 so Intuit doesn't retry indefinitely.
    return NextResponse.json({ ok: true, error: (e as Error).message });
  }
}

export const GET = handle;
export const POST = handle;
