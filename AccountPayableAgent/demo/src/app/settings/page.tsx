import { isConnected } from "@/lib/integrations/tokens";
import { SettingsClient } from "./settings-client";

export const metadata = {
  title: "PayablePilot · Settings",
};

// Read connection state on the server so the page renders correctly on first paint.
export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ gmail?: string; qbo?: string; reason?: string }>;
}) {
  const sp = await searchParams;
  const [gmailConnected, qboConnected] = await Promise.all([
    isConnected("gmail"),
    isConnected("qbo"),
  ]);

  return (
    <SettingsClient
      gmailConnected={gmailConnected}
      qboConnected={qboConnected}
      flash={{
        gmail: sp.gmail ?? null,
        qbo: sp.qbo ?? null,
        reason: sp.reason ?? null,
      }}
    />
  );
}
