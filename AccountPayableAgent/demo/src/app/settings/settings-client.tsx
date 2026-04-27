"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mail, BookOpen, ArrowLeft, Check, X, Loader2, ExternalLink, Zap, Bell, Inbox, Send, ShieldCheck } from "lucide-react";
import { PilotMark } from "@/components/pilot-mark";
import {
  AutomationKey,
  AutomationSettings,
  DEFAULT_AUTOMATION,
  WorkflowStyle,
  loadAutomation,
  saveAutomation,
} from "@/lib/automation-settings";

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
  const [automation, setAutomation] = useState<AutomationSettings>(DEFAULT_AUTOMATION);
  const [savedFlash, setSavedFlash] = useState(false);

  useEffect(() => {
    setAutomation(loadAutomation());
  }, []);

  const updateAutomation = <K extends keyof AutomationSettings>(key: K, value: AutomationSettings[K]) => {
    setAutomation((prev) => {
      const next = { ...prev, [key]: value };
      saveAutomation(next);
      return next;
    });
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1200);
  };

  const resetAutomation = () => {
    setAutomation(DEFAULT_AUTOMATION);
    saveAutomation(DEFAULT_AUTOMATION);
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1200);
  };

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

      <main className="max-w-[920px] mx-auto px-6 py-10 space-y-10">
        <div>
          <h1 className="text-[28px] font-semibold tracking-tight">Settings</h1>
          <p className="mt-1 text-neutral-500 text-sm max-w-prose">
            Connect your AP inbox and your books, then decide which actions PayablePilot should take on its own and
            which should wait for your approval.
          </p>
        </div>

        <FlashBanner flash={flash} />

        <section className="space-y-4">
          <SectionHeader title="Integrations" subtitle="Where invoices come from and where bills get posted." />
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
        </section>

        <section className="space-y-4">
          <div className="flex items-end justify-between gap-3 flex-wrap">
            <SectionHeader
              title="Automation"
              subtitle="Pick which actions PayablePilot takes on its own and which should wait for you."
            />
            <div className="flex items-center gap-3">
              {savedFlash && (
                <span className="inline-flex items-center gap-1 text-[12px] text-emerald-700">
                  <Check className="w-3.5 h-3.5" /> Saved
                </span>
              )}
              <button
                onClick={resetAutomation}
                className="text-[12px] text-neutral-500 hover:text-neutral-900 hover:underline"
              >
                Reset to defaults
              </button>
            </div>
          </div>

          <WorkflowStyleCard
            value={automation.workflowStyle}
            onChange={(v) => updateAutomation("workflowStyle", v)}
          />

          <AutomationGroup
            title="When new invoices arrive"
            icon={<Inbox className="w-4 h-4" />}
            items={[
              { key: "autoExtractFields", label: "Extract vendor, amount, line items, PO ref", help: "Runs OCR + structured extraction on every PDF or image attachment.", safe: true },
              { key: "autoMatchPOs", label: "Match against open POs and receiving", help: "Two- and three-way matching against approved POs.", safe: true },
              { key: "autoBlockDuplicates", label: "Block duplicate invoices from posting", help: "Detects re-sent invoices that have already been posted or paid.", safe: true },
            ]}
            automation={automation}
            onChange={updateAutomation}
          />

          <AutomationGroup
            title="When something needs follow-up"
            icon={<Send className="w-4 h-4" />}
            items={[
              { key: "autoReplyDiscrepancies", label: "Auto-send vendor reply on pricing discrepancies", help: "Default off: agent drafts the reply but waits for your approval before sending." },
              { key: "autoChaseReceipts", label: "Chase cardholders for missing receipts" },
              { key: "autoChaseW9", label: "Chase vendors for missing W-9s" },
              { key: "autoRemindOverdue", label: "Send reminders on overdue invoices (30 / 60 / 90 days)" },
              { key: "autoReconcileStatements", label: "Reconcile vendor statements monthly" },
            ]}
            automation={automation}
            onChange={updateAutomation}
          />

          <AutomationGroup
            title="When ready to post to QuickBooks"
            icon={<ShieldCheck className="w-4 h-4" />}
            items={[
              {
                key: "autoPostToQuickBooks",
                label: "Auto-post matched bills without my approval",
                help: "Default off: matched bills wait in your approval queue. Only flip this on for low-risk vendors.",
                danger: true,
              },
            ]}
            automation={automation}
            onChange={updateAutomation}
          />

          <AutomationGroup
            title="Notifications"
            icon={<Bell className="w-4 h-4" />}
            items={[
              { key: "sendDailyDigest", label: "Send my daily digest" },
              { key: "notifyOnDiscrepancies", label: "Ping me when a discrepancy is flagged" },
            ]}
            automation={automation}
            onChange={updateAutomation}
          >
            <div className="flex items-center justify-between gap-3 px-4 py-3 border-t border-neutral-100">
              <div>
                <div className="text-[13.5px] font-medium text-neutral-800">Digest delivery time</div>
                <div className="text-[12px] text-neutral-500">Local time. Used when "Send my daily digest" is on.</div>
              </div>
              <input
                type="time"
                value={automation.digestTime}
                onChange={(e) => updateAutomation("digestTime", e.target.value)}
                disabled={!automation.sendDailyDigest}
                className="h-9 px-3 rounded-md border border-neutral-200 bg-white text-[13px] tabular-nums disabled:opacity-50"
              />
            </div>
          </AutomationGroup>
        </section>

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

function SectionHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div>
      <h2 className="text-[18px] font-semibold tracking-tight">{title}</h2>
      <p className="mt-0.5 text-[13px] text-neutral-500 max-w-prose">{subtitle}</p>
    </div>
  );
}

type AutomationItem = {
  key: AutomationKey;
  label: string;
  help?: string;
  safe?: boolean;
  danger?: boolean;
};

function AutomationGroup({
  title,
  icon,
  items,
  automation,
  onChange,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  items: AutomationItem[];
  automation: AutomationSettings;
  onChange: <K extends keyof AutomationSettings>(key: K, value: AutomationSettings[K]) => void;
  children?: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
      <div className="px-4 py-3 border-b border-neutral-100 flex items-center gap-2 text-[12.5px] uppercase tracking-wider text-neutral-500 font-medium">
        <span className="text-neutral-400">{icon}</span>
        {title}
      </div>
      <div>
        {items.map((it, idx) => (
          <ToggleRow
            key={it.key}
            label={it.label}
            help={it.help}
            safe={it.safe}
            danger={it.danger}
            value={automation[it.key] as boolean}
            onChange={(v) => onChange(it.key, v as AutomationSettings[typeof it.key])}
            isLast={idx === items.length - 1 && !children}
          />
        ))}
        {children}
      </div>
    </div>
  );
}

function ToggleRow({
  label,
  help,
  value,
  onChange,
  safe,
  danger,
  isLast,
}: {
  label: string;
  help?: string;
  value: boolean;
  onChange: (v: boolean) => void;
  safe?: boolean;
  danger?: boolean;
  isLast?: boolean;
}) {
  return (
    <div
      className={
        "flex items-start justify-between gap-3 px-4 py-3 " +
        (isLast ? "" : "border-b border-neutral-100")
      }
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[13.5px] font-medium text-neutral-800">{label}</span>
          {safe && (
            <span className="text-[10.5px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
              Safe to keep on
            </span>
          )}
          {danger && (
            <span className="text-[10.5px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
              Skips your approval
            </span>
          )}
        </div>
        {help && <div className="mt-0.5 text-[12px] text-neutral-500">{help}</div>}
      </div>
      <Toggle value={value} onChange={onChange} />
    </div>
  );
}

function WorkflowStyleCard({
  value,
  onChange,
}: {
  value: WorkflowStyle;
  onChange: (v: WorkflowStyle) => void;
}) {
  const options: Array<{ key: WorkflowStyle; title: string; tag?: string; body: string }> = [
    {
      key: "strict",
      title: "Strict",
      tag: "POs required",
      body: "Every invoice must match an approved PO and signed receiving doc before it can post. Best for property managers, larger ops with formal procurement.",
    },
    {
      key: "standard",
      title: "Standard",
      tag: "POs optional",
      body: "Match against a PO when one exists, otherwise post the bill directly. Good fit for most SMBs and trades shops that use POs only on big jobs.",
    },
    {
      key: "bills_only",
      title: "Bills only",
      tag: "No matching",
      body: "Skip the matching step entirely. Captured invoices flow straight to 'ready to post' for your approval. Best for service businesses (HVAC, contractors, cleaners) without formal POs.",
    },
  ];

  return (
    <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
      <div className="px-4 py-3 border-b border-neutral-100 flex items-center gap-2 text-[12.5px] uppercase tracking-wider text-neutral-500 font-medium">
        <Inbox className="w-4 h-4 text-neutral-400" />
        Workflow style
      </div>
      <div className="p-3 grid grid-cols-1 md:grid-cols-3 gap-3">
        {options.map((o) => {
          const selected = o.key === value;
          return (
            <button
              key={o.key}
              type="button"
              onClick={() => onChange(o.key)}
              className={
                "text-left p-4 rounded-lg border transition-colors " +
                (selected
                  ? "border-neutral-900 bg-neutral-50 ring-1 ring-neutral-900"
                  : "border-neutral-200 bg-white hover:border-neutral-400 hover:bg-neutral-50")
              }
            >
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[14px] font-semibold tracking-tight">{o.title}</span>
                {o.tag && (
                  <span
                    className={
                      "text-[10.5px] uppercase tracking-wider px-1.5 py-0.5 rounded border " +
                      (selected
                        ? "bg-neutral-900 text-white border-neutral-900"
                        : "bg-neutral-50 text-neutral-600 border-neutral-200")
                    }
                  >
                    {o.tag}
                  </span>
                )}
                {selected && <Check className="w-4 h-4 text-neutral-900 ml-auto" />}
              </div>
              <div className="mt-2 text-[12.5px] text-neutral-600 leading-relaxed">{o.body}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      onClick={() => onChange(!value)}
      className={
        "relative shrink-0 inline-flex h-6 w-11 items-center rounded-full transition-colors " +
        (value ? "bg-neutral-900" : "bg-neutral-300")
      }
    >
      <span
        className={
          "inline-block h-5 w-5 transform rounded-full bg-white transition-transform shadow-sm " +
          (value ? "translate-x-[22px]" : "translate-x-[2px]")
        }
      />
    </button>
  );
}
