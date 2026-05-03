import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { isConnected } from "@/lib/integrations/tokens";
import { getActiveBusiness, listAccessibleBusinesses, requireUser } from "@/lib/auth/current";
import { getCurrentFirmId, getFirmGmailStatus } from "@/lib/integrations/firm-gmail";
import { fullInboxAddress } from "@/lib/businesses/alias";
import { SettingsClient } from "./settings-client";

export const metadata = {
  title: "PayablePilot · Settings",
};

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ gmail?: string; qbo?: string; reason?: string }>;
}) {
  await requireUser();
  const sp = await searchParams;

  const businesses = await listAccessibleBusinesses();
  if (businesses.length === 0) redirect("/onboarding/business");

  const active = await getActiveBusiness();
  if (!active) redirect("/onboarding/business");

  const firmId = await getCurrentFirmId();
  const [firmGmail, qboConnected] = await Promise.all([
    firmId ? getFirmGmailStatus(firmId) : Promise.resolve({ connected: false, email: null, connectionId: null }),
    isConnected("qbo"),
  ]);

  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "http";
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:4380";
  const origin = process.env.NEXT_PUBLIC_APP_URL || `${proto}://${host}`;

  return (
    <SettingsClient
      firmGmail={firmGmail}
      qboConnected={qboConnected}
      flash={{
        gmail: sp.gmail ?? null,
        qbo: sp.qbo ?? null,
        reason: sp.reason ?? null,
      }}
      business={active}
      inboxAddress={fullInboxAddress(active.inbox_alias)}
      businesses={businesses}
      origin={origin}
    />
  );
}
