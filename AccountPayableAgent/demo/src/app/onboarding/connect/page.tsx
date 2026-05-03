import Link from "next/link";
import { redirect } from "next/navigation";
import { getActiveBusiness, requireUser } from "@/lib/auth/current";
import { isConnected } from "@/lib/integrations/tokens";
import { getCurrentFirmId, getFirmGmailStatus } from "@/lib/integrations/firm-gmail";
import { ConnectStep } from "./connect-step";
import { FirmGmailCard } from "./firm-gmail-card";
import { PilotMark } from "@/components/pilot-mark";
import { BookOpen, Check } from "lucide-react";

export const metadata = { title: "PayablePilot · Connect integrations" };

export default async function OnboardingConnectPage({
  searchParams,
}: {
  searchParams: Promise<{ gmail?: string; qbo?: string; reason?: string }>;
}) {
  await requireUser();
  const sp = await searchParams;
  const business = await getActiveBusiness();
  if (!business) redirect("/onboarding/business");

  const firmId = await getCurrentFirmId();
  const [gmail, qboConnected] = await Promise.all([
    firmId ? getFirmGmailStatus(firmId) : Promise.resolve({ connected: false, email: null, connectionId: null }),
    isConnected("qbo"),
  ]);

  return (
    <div className="min-h-screen bg-neutral-50 grid place-items-center px-6 py-12">
      <div className="w-full max-w-[560px]">
        <div className="flex items-center gap-2.5 mb-8">
          <div className="w-8 h-8 rounded-md bg-neutral-900 text-white grid place-items-center">
            <PilotMark className="w-4 h-4" />
          </div>
          <span className="font-semibold tracking-tight text-neutral-900">PayablePilot</span>
        </div>

        <div className="text-[12px] uppercase tracking-wider text-neutral-500 font-medium">Step 2 of 2</div>
        <h1 className="mt-1 text-[24px] font-semibold tracking-tight text-neutral-900">
          Connect {business.name}
        </h1>
        <p className="mt-1 text-[14px] text-neutral-500">
          QuickBooks is per-business. Gmail is shared across every business you manage — connect it once and we
          route each invoice automatically.
        </p>

        {(sp.gmail === "error" || sp.qbo === "error") && (
          <div className="mt-4 rounded-md border border-rose-200 bg-rose-50 text-rose-800 px-3 py-2 text-[13px]">
            Connection failed{sp.reason ? `: ${decodeURIComponent(sp.reason)}` : ""}. Try again.
          </div>
        )}

        <div className="mt-6 space-y-3">
          <FirmGmailCard email={gmail.email} connected={gmail.connected} />
          <ConnectStep
            name="QuickBooks Online"
            description={`Post matched bills to ${business.name}'s QuickBooks. Each business has its own QBO file.`}
            icon={<BookOpen className="w-5 h-5 text-emerald-600" />}
            connected={qboConnected}
            connectHref="/api/integrations/qbo/auth"
          />
        </div>

        <div className="mt-8 flex items-center gap-3">
          <Link
            href="/app"
            className={
              "inline-flex items-center justify-center gap-2 h-10 px-4 rounded-md text-[14px] font-medium " +
              (gmail.connected && qboConnected
                ? "bg-neutral-900 text-white hover:opacity-90"
                : "bg-neutral-100 text-neutral-500")
            }
          >
            {gmail.connected && qboConnected ? (
              <>
                <Check className="w-4 h-4" /> Go to workspace
              </>
            ) : (
              "Skip for now"
            )}
          </Link>
          <span className="text-[12px] text-neutral-400">You can connect more clients from settings.</span>
        </div>
      </div>
    </div>
  );
}
