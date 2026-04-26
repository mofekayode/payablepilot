"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mail, BookOpen, ArrowLeft, Check, X, Loader2, ExternalLink } from "lucide-react";
import { PilotMark } from "@/components/pilot-mark";

type Flash = { gmail: string | null; qbo: string | null; reason: string | null };

export function SettingsClient({
  gmailConnected,
  qboConnected,
  flash,
}: {
  gmailConnected: boolean;
  qboConnected: boolean;
  flash: Flash;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<"gmail" | "qbo" | null>(null);

  const disconnect = async (provider: "gmail" | "qbo") => {
    setBusy(provider);
    await fetch(`/api/integrations/${provider}/disconnect`, { method: "POST" });
    setBusy(null);
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900">
      <header className="bg-white border-b border-neutral-200">
        <div className="max-w-[920px] mx-auto px-6 py-4 flex items-center gap-3">
          <Link href="/app" className="text-neutral-500 hover:text-neutral-900 text-sm flex items-center gap-1">
            <ArrowLeft className="w-4 h-4" /> Back to app
          </Link>
          <div className="ml-auto flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md bg-neutral-900 text-white grid place-items-center">
              <PilotMark className="w-4 h-4" />
            </div>
            <span className="font-semibold tracking-tight">PayablePilot</span>
          </div>
        </div>
      </header>

      <main className="max-w-[920px] mx-auto px-6 py-10 space-y-8">
        <div>
          <h1 className="text-[28px] font-semibold tracking-tight">Integrations</h1>
          <p className="mt-1 text-neutral-500 text-sm max-w-prose">
            Connect your AP inbox and your books. PayablePilot reads new invoice emails from Gmail and posts the matched
            bills directly to QuickBooks Online — every payment still waits on your approval.
          </p>
        </div>

        <FlashBanner flash={flash} />

        <div className="space-y-4">
          <IntegrationCard
            name="Gmail"
            description="Read new invoice emails from your AP mailbox. Read-only — we never send or modify mail."
            icon={<Mail className="w-5 h-5 text-rose-600" />}
            connected={gmailConnected}
            connectHref="/api/integrations/gmail/auth"
            onDisconnect={() => disconnect("gmail")}
            busy={busy === "gmail"}
            requiredEnv={["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "GOOGLE_REDIRECT_URI"]}
            consoleHref="https://console.cloud.google.com/apis/credentials"
            consoleLabel="Google Cloud · OAuth credentials"
          />
          <IntegrationCard
            name="QuickBooks Online"
            description="Post matched bills, sync vendors and chart of accounts. You release the actual payment from inside QuickBooks."
            icon={<BookOpen className="w-5 h-5 text-emerald-600" />}
            connected={qboConnected}
            connectHref="/api/integrations/qbo/auth"
            onDisconnect={() => disconnect("qbo")}
            busy={busy === "qbo"}
            requiredEnv={["QBO_CLIENT_ID", "QBO_CLIENT_SECRET", "QBO_REDIRECT_URI", "QBO_ENV"]}
            consoleHref="https://developer.intuit.com/app/developer/dashboard"
            consoleLabel="Intuit Developer · Apps"
          />
        </div>

        <div className="bg-white rounded-xl border border-neutral-200 p-5 text-sm text-neutral-600 leading-relaxed">
          <div className="font-medium text-neutral-900 mb-2">Setup notes</div>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>
              See <code className="font-mono text-[12.5px] px-1 py-0.5 bg-neutral-100 rounded">.env.example</code> for
              the required environment variables.
            </li>
            <li>
              Tokens are stored in HTTP-only cookies for this demo. Production deployments should persist tokens in a
              database keyed by user/org.
            </li>
            <li>
              Set the redirect URIs in each provider's developer console to point at{" "}
              <code className="font-mono text-[12.5px] px-1 py-0.5 bg-neutral-100 rounded">
                /api/integrations/&lt;provider&gt;/callback
              </code>{" "}
              on this app's hostname.
            </li>
          </ul>
        </div>
      </main>
    </div>
  );
}

function FlashBanner({ flash }: { flash: Flash }) {
  if (!flash.gmail && !flash.qbo) return null;
  const messages: { tone: "ok" | "err"; text: string }[] = [];
  if (flash.gmail === "connected") messages.push({ tone: "ok", text: "Gmail connected." });
  if (flash.gmail === "error") messages.push({ tone: "err", text: `Gmail connection failed${flash.reason ? `: ${decodeURIComponent(flash.reason)}` : ""}.` });
  if (flash.qbo === "connected") messages.push({ tone: "ok", text: "QuickBooks connected." });
  if (flash.qbo === "error") messages.push({ tone: "err", text: `QuickBooks connection failed${flash.reason ? `: ${decodeURIComponent(flash.reason)}` : ""}.` });
  if (messages.length === 0) return null;
  return (
    <div className="space-y-2">
      {messages.map((m, i) => (
        <div
          key={i}
          className={
            m.tone === "ok"
              ? "rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-800 px-4 py-2.5 text-sm flex items-center gap-2"
              : "rounded-lg border border-rose-200 bg-rose-50 text-rose-800 px-4 py-2.5 text-sm flex items-center gap-2"
          }
        >
          {m.tone === "ok" ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
          {m.text}
        </div>
      ))}
    </div>
  );
}

function IntegrationCard({
  name,
  description,
  icon,
  connected,
  connectHref,
  onDisconnect,
  busy,
  requiredEnv,
  consoleHref,
  consoleLabel,
}: {
  name: string;
  description: string;
  icon: React.ReactNode;
  connected: boolean;
  connectHref: string;
  onDisconnect: () => void;
  busy: boolean;
  requiredEnv: string[];
  consoleHref: string;
  consoleLabel: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-neutral-200 p-5">
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-lg bg-neutral-50 border border-neutral-200 grid place-items-center shrink-0">
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[16px] font-semibold tracking-tight">{name}</span>
            {connected ? (
              <span className="inline-flex items-center gap-1 text-[11.5px] font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                <Check className="w-3 h-3" /> Connected
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11.5px] font-medium px-2 py-0.5 rounded-full bg-neutral-50 text-neutral-600 border border-neutral-200">
                Not connected
              </span>
            )}
          </div>
          <p className="mt-1 text-[13.5px] text-neutral-600 leading-relaxed">{description}</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {requiredEnv.map((v) => (
              <code key={v} className="font-mono text-[11.5px] px-1.5 py-0.5 bg-neutral-100 text-neutral-700 rounded">
                {v}
              </code>
            ))}
          </div>
          <a
            href={consoleHref}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex items-center gap-1 text-[12.5px] text-neutral-500 hover:text-neutral-900"
          >
            {consoleLabel} <ExternalLink className="w-3 h-3" />
          </a>
        </div>
        <div className="shrink-0">
          {connected ? (
            <button
              onClick={onDisconnect}
              disabled={busy}
              className="inline-flex items-center gap-2 h-9 px-3 rounded-md border border-neutral-300 text-neutral-700 text-[13px] font-medium hover:bg-neutral-50 disabled:opacity-50"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Disconnect
            </button>
          ) : (
            <a
              href={connectHref}
              className="inline-flex items-center gap-2 h-9 px-4 rounded-md bg-neutral-900 text-white text-[13px] font-medium hover:opacity-90"
            >
              Connect
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
