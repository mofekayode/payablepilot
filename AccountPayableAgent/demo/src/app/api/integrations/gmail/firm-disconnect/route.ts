// Disconnect the firm-level Gmail mailbox.
//
// This wipes the OAuth tokens AND tries to stop the active Push watch on
// Gmail's side (best effort — if the call fails we still clear the row,
// since the watch will lapse on its own within 7 days).

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { clearTokensForFirm, getTokensForFirm } from "@/lib/integrations/tokens";
import { buildGmailFromTokens, stopWatch } from "@/lib/integrations/gmail";

export async function POST() {
  const user = await getCurrentUser();
  if (!user) return new NextResponse("not_authenticated", { status: 401 });

  const supabase = await createSupabaseServerClient();
  const { data: membership } = await supabase
    .from("firm_members")
    .select("firm_id")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (!membership?.firm_id) return new NextResponse("no_firm", { status: 400 });

  // Best-effort stop-watch before clearing the token, so Pub/Sub stops
  // sending notifications for this mailbox.
  try {
    const tokens = await getTokensForFirm(membership.firm_id, "gmail");
    if (tokens) {
      const gmail = await buildGmailFromTokens(tokens);
      await stopWatch(gmail);
    }
  } catch (e) {
    console.warn("[firm-disconnect] stopWatch failed (ignoring):", (e as Error).message);
  }

  await clearTokensForFirm(membership.firm_id, "gmail", { actorUserId: user.id });

  return NextResponse.json({ ok: true });
}
