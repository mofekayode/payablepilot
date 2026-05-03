"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, Check, Loader2 } from "lucide-react";

export function FirmGmailCard({
  connected,
  email,
}: {
  connected: boolean;
  email: string | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function disconnect() {
    if (!confirm("Disconnect this mailbox? Invoices stop arriving until you reconnect.")) return;
    setBusy(true);
    await fetch("/api/integrations/gmail/firm-disconnect", { method: "POST" });
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="bg-white rounded-xl border border-neutral-200 p-4 flex items-start gap-4">
      <div className="w-10 h-10 rounded-lg bg-neutral-50 border border-neutral-200 grid place-items-center shrink-0">
        <Mail className="w-5 h-5 text-rose-600" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[15px] font-semibold tracking-tight text-neutral-900">Gmail</span>
          {connected ? (
            <span className="inline-flex items-center gap-1 text-[11.5px] font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              <Check className="w-3 h-3" /> Connected
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[11.5px] font-medium px-2 py-0.5 rounded-full bg-neutral-50 text-neutral-600 border border-neutral-200">
              Not connected
            </span>
          )}
          <span className="inline-flex items-center text-[10.5px] font-medium px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-600">
            shared across all businesses
          </span>
        </div>
        {connected ? (
          <p className="mt-1 text-[13px] text-neutral-600 leading-relaxed">
            Reading invoices from <span className="font-medium text-neutral-900">{email ?? "your mailbox"}</span>.
            Every invoice that arrives is routed to the right business automatically — no extra setup for new
            clients.
          </p>
        ) : (
          <p className="mt-1 text-[13px] text-neutral-600 leading-relaxed">
            Connect your AP mailbox once. PayablePilot reads it in real time and routes each invoice to the
            right client based on Bill-To and sender history.
          </p>
        )}
      </div>
      <div className="shrink-0">
        {connected ? (
          <button
            type="button"
            onClick={disconnect}
            disabled={busy}
            className="inline-flex items-center gap-2 h-9 px-3 rounded-md border border-neutral-300 text-neutral-700 text-[13px] font-medium hover:bg-neutral-50 disabled:opacity-50"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Disconnect
          </button>
        ) : (
          <a
            href="/api/integrations/gmail/firm-auth"
            className="inline-flex items-center justify-center h-9 px-4 rounded-md bg-neutral-900 text-white text-[13px] font-medium hover:opacity-90"
          >
            Connect
          </a>
        )}
      </div>
    </div>
  );
}
