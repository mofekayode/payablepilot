// Public Connect/Reconnect URL for QuickBooks Online — the URL listed in
// Intuit Developer's app profile. Intuit (and any user clicking from
// outside our app) lands here; we handle the auth state gracefully:
//   - Not signed in → /sign-in?next=/connect/qbo (returns here after auth)
//   - Signed in but no business yet → /onboarding/business
//   - Signed in with a business → kick off the QBO OAuth flow
//
// Keeping this in front of the OAuth init route lets us avoid 500-ing
// when Intuit's automated checker hits the URL (the OAuth init route
// requires an active-business cookie that an unauthenticated request
// can't have).

import { redirect } from "next/navigation";
import { getCurrentUser, listAccessibleBusinesses } from "@/lib/auth/current";

export const metadata = { title: "PayablePilot · Connect QuickBooks" };

export default async function ConnectQboPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/sign-in?next=/connect/qbo");
  }
  const businesses = await listAccessibleBusinesses();
  if (businesses.length === 0) {
    redirect("/onboarding/business");
  }
  // Active business cookie is set when the user creates or switches into
  // a business; getActiveBusiness() resolves it. Fall through to the
  // OAuth init route, which uses requireActiveBusinessId().
  redirect("/api/integrations/qbo/auth");
}
