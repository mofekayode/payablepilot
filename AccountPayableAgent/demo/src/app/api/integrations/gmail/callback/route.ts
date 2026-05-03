// Gmail OAuth callback. Handles two scopes:
//   - business-level: pp_gmail_business cookie carries the target business.
//   - firm-level:     pp_gmail_firm cookie carries the firm id.
// Whichever cookie is present decides where the tokens land.

import { NextRequest, NextResponse } from "next/server";
import { exchangeCode, buildGmailFromTokens, getProfileEmail, startWatch } from "@/lib/integrations/gmail";
import { setTokensForBusiness, setTokensForFirm } from "@/lib/integrations/tokens";
import { appendFlash } from "@/lib/integrations/return-to";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/auth/current";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const expectedState = req.cookies.get("pp_gmail_state")?.value;
  const businessId = req.cookies.get("pp_gmail_business")?.value;
  const firmId = req.cookies.get("pp_gmail_firm")?.value;
  const returnTo = req.cookies.get("pp_gmail_return")?.value || "/settings";

  function back(params: Record<string, string>) {
    const res = NextResponse.redirect(new URL(appendFlash(returnTo, params), req.url));
    res.cookies.delete("pp_gmail_state");
    res.cookies.delete("pp_gmail_business");
    res.cookies.delete("pp_gmail_firm");
    res.cookies.delete("pp_gmail_return");
    return res;
  }

  if (!code) return back({ gmail: "error", reason: "missing_code" });
  if (!state || state !== expectedState) return back({ gmail: "error", reason: "state_mismatch" });
  if (!businessId && !firmId) return back({ gmail: "error", reason: "missing_scope" });

  try {
    const tokens = await exchangeCode(code);

    if (firmId) {
      // Pull the connected mailbox's email so the Push webhook can route
      // notifications back to the right connection.
      let email: string | null = null;
      try {
        const gmail = await buildGmailFromTokens(tokens);
        email = await getProfileEmail(gmail);
      } catch (e) {
        console.error("[gmail-callback] getProfileEmail failed:", e);
      }
      const tokensWithEmail = {
        ...tokens,
        extra: { ...(tokens.extra ?? {}), ...(email ? { email: email.toLowerCase() } : {}) },
      };
      const user = await getCurrentUser();
      const { connectionId } = await setTokensForFirm(firmId, "gmail", tokensWithEmail, {
        actorUserId: user?.id ?? null,
      });

      // Best-effort: arm the Push watch immediately if Pub/Sub is configured.
      const topic = process.env.GMAIL_PUBSUB_TOPIC;
      if (topic) {
        try {
          const gmail = await buildGmailFromTokens(tokensWithEmail);
          const watch = await startWatch(gmail, topic);
          const admin = createSupabaseAdminClient();
          await admin.from("gmail_sync_state").upsert({
            connection_id: connectionId,
            watch_expires_at: new Date(watch.expiration).toISOString(),
            // Initial historyId becomes the resume point for future
            // notifications. Recorded only if not already present.
            last_history_id: watch.historyId || null,
          });
        } catch (e) {
          console.error("[gmail-callback] startWatch failed:", e);
          // Push isn't fatal — polling will still pick things up.
        }
      }
    } else if (businessId) {
      await setTokensForBusiness(businessId, "gmail", tokens);
    }

    return back({ gmail: "connected" });
  } catch (e) {
    return back({ gmail: "error", reason: encodeURIComponent((e as Error).message) });
  }
}
