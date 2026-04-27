"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Mail,
  BookOpen,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Inbox as InboxIcon,
  CreditCard,
  Briefcase,
  Users,
  ArrowRight,
} from "lucide-react";
import type { LiveView } from "../sidebar-live";
import { CapturedInvoice, loadCaptured } from "@/lib/captured-store";
import { cn } from "@/lib/utils";

export function DashboardView({
  onNavigate,
  conn,
}: {
  onNavigate: (v: LiveView) => void;
  conn: { gmail: boolean; qbo: boolean; loading: boolean };
}) {
  const [captured, setCaptured] = useState<CapturedInvoice[]>([]);

  useEffect(() => {
    function refresh() {
      setCaptured(loadCaptured());
    }
    refresh();
    window.addEventListener("pp:captured:changed", refresh);
    return () => window.removeEventListener("pp:captured:changed", refresh);
  }, []);

  const extractedToday = captured.filter(
    (c) => c.status === "extracted" && new Date(c.createdAt).toDateString() === new Date().toDateString()
  ).length;
  const ready = captured.filter((c) => c.status === "ready").length;
  const posted = captured.filter((c) => c.status === "posted").length;
  const errored = captured.filter((c) => c.status === "error").length;
  const recent = [...captured].slice(0, 6);

  return (
    <div className="h-full overflow-auto scrollbar-thin">
      <div className="max-w-[1100px] mx-auto px-8 py-8 space-y-7">
        <div>
          <div className="text-xs uppercase tracking-wider text-muted">Dashboard</div>
          <h1 className="mt-1 text-[28px] font-semibold tracking-tight">
            {conn.gmail && conn.qbo ? "You're connected. Let's process some bills." : "Almost ready — connect your accounts to start."}
          </h1>
          <p className="mt-1 text-sm text-muted max-w-prose">
            PayablePilot reads invoices from your Gmail, extracts the fields automatically, and posts the bills directly
            to QuickBooks for your approval.
          </p>
        </div>

        {!conn.loading && (!conn.gmail || !conn.qbo) && (
          <ConnectBanner gmailConnected={conn.gmail} qboConnected={conn.qbo} />
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard
            label="Extracted today"
            value={extractedToday}
            sub="Awaiting review"
            icon={<Sparkles className="w-4 h-4 text-brand" />}
            onClick={() => onNavigate("inbox")}
          />
          <StatCard
            label="Bills ready to post"
            value={ready}
            sub="One click to QBO"
            icon={<CreditCard className="w-4 h-4 text-emerald-600" />}
            onClick={() => onNavigate("bills")}
          />
          <StatCard
            label="Posted to QuickBooks"
            value={posted}
            sub="All time"
            icon={<CheckCircle2 className="w-4 h-4 text-emerald-700" />}
          />
          <StatCard
            label="Errors"
            value={errored}
            sub={errored === 0 ? "Clean" : "Review needed"}
            icon={<AlertCircle className={cn("w-4 h-4", errored > 0 ? "text-rose-600" : "text-muted")} />}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <ActionCard
            title="Live inbox"
            body="See new attachment-bearing emails from your Gmail. Click any PDF to auto-extract its fields."
            cta="Open inbox"
            icon={<InboxIcon className="w-5 h-5" />}
            onClick={() => onNavigate("inbox")}
            disabled={!conn.gmail}
            disabledHint="Connect Gmail first"
          />
          <ActionCard
            title="Bills to post"
            body="Review extracted bills, assign vendors and projects, then push them to QuickBooks Online for your approval."
            cta="Open bills queue"
            icon={<CreditCard className="w-5 h-5" />}
            onClick={() => onNavigate("bills")}
            disabled={!conn.qbo}
            disabledHint="Connect QuickBooks first"
          />
          <ActionCard
            title="Projects & Vendors"
            body="Browse the projects and vendors PayablePilot is syncing from QuickBooks. New projects added in QBO show up automatically."
            cta="Open projects"
            icon={<Briefcase className="w-5 h-5" />}
            onClick={() => onNavigate("projects")}
            disabled={!conn.qbo}
            disabledHint="Connect QuickBooks first"
          />
        </div>

        {recent.length > 0 && (
          <div className="bg-background rounded-xl border border-border overflow-hidden">
            <div className="px-5 py-3 border-b border-border flex items-center justify-between">
              <span className="text-sm font-medium">Recent activity</span>
              <button onClick={() => onNavigate("bills")} className="text-[12.5px] text-muted hover:text-foreground inline-flex items-center gap-1">
                See all <ArrowRight className="w-3 h-3" />
              </button>
            </div>
            <ul>
              {recent.map((c) => (
                <li key={c.id} className="flex items-center gap-3 px-5 py-3 border-b border-border last:border-0">
                  <StatusDot status={c.status} />
                  <div className="min-w-0 flex-1">
                    <div className="text-[13.5px] font-medium truncate">
                      {c.vendorName ?? "Awaiting extraction"} · {c.invoiceNumber ?? "—"}
                    </div>
                    <div className="text-[12px] text-muted truncate">
                      {c.source.kind === "gmail" ? `From ${c.source.fromName || c.source.fromEmail}` : `Uploaded ${c.source.fileName}`}
                      {c.qboProjectName ? ` · ${c.qboProjectName}` : ""}
                    </div>
                  </div>
                  <div className="text-[12.5px] text-muted shrink-0 tabular-nums">
                    {c.total != null
                      ? new Intl.NumberFormat("en-US", { style: "currency", currency: c.currency || "USD" }).format(c.total)
                      : "—"}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {captured.length === 0 && conn.gmail && (
          <div className="rounded-xl border border-dashed border-border bg-background p-8 text-center">
            <div className="text-[15px] font-medium mb-1">Nothing extracted yet.</div>
            <div className="text-[13px] text-muted max-w-md mx-auto">
              Open the inbox, pick an email with a PDF attachment, and hit Extract. The extracted bill will land here ready for
              your review.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ConnectBanner({ gmailConnected, qboConnected }: { gmailConnected: boolean; qboConnected: boolean }) {
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 flex items-start gap-3 text-amber-950">
      <AlertCircle className="w-5 h-5 mt-0.5 shrink-0 text-amber-700" />
      <div className="flex-1 text-[13.5px] leading-relaxed">
        <div className="font-medium">Finish connecting your accounts.</div>
        <div className="mt-0.5">
          {!gmailConnected && "Gmail (read-only) "}
          {!gmailConnected && !qboConnected && "and "}
          {!qboConnected && "QuickBooks Online "}
          {!gmailConnected && !qboConnected ? "are " : "is "}
          required so we can read your invoices and post bills.
        </div>
      </div>
      <Link
        href="/settings"
        className="shrink-0 inline-flex items-center gap-1 h-9 px-3 rounded-md bg-amber-900 text-amber-50 text-[13px] font-medium hover:bg-amber-800"
      >
        Open settings <ArrowRight className="w-3.5 h-3.5" />
      </Link>
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  icon,
  onClick,
}: {
  label: string;
  value: number;
  sub: string;
  icon: React.ReactNode;
  onClick?: () => void;
}) {
  const Wrapper = onClick ? "button" : ("div" as const);
  return (
    <Wrapper
      onClick={onClick}
      className={cn(
        "text-left bg-background rounded-xl border border-border p-4",
        onClick && "hover:border-foreground/40 hover:bg-surface transition-colors cursor-pointer"
      )}
    >
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-muted font-medium">
        {icon}
        {label}
      </div>
      <div className="mt-2 text-[26px] font-semibold tabular-nums">{value}</div>
      <div className="text-[12px] text-muted">{sub}</div>
    </Wrapper>
  );
}

function ActionCard({
  title,
  body,
  cta,
  icon,
  onClick,
  disabled,
  disabledHint,
}: {
  title: string;
  body: string;
  cta: string;
  icon: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  disabledHint?: string;
}) {
  return (
    <div className="bg-background rounded-xl border border-border p-5 flex flex-col">
      <div className="flex items-center gap-2 text-[14px] font-semibold tracking-tight">
        <span className="text-foreground">{icon}</span>
        {title}
      </div>
      <p className="mt-2 text-[13px] text-muted leading-relaxed flex-1">{body}</p>
      <button
        onClick={onClick}
        disabled={disabled}
        className={cn(
          "mt-4 inline-flex items-center justify-center gap-1.5 h-9 px-3 rounded-md text-[13px] font-medium border",
          disabled
            ? "border-border text-muted cursor-not-allowed bg-surface"
            : "border-foreground bg-foreground text-background hover:opacity-90"
        )}
        title={disabled ? disabledHint : undefined}
      >
        {disabled ? disabledHint : cta} {!disabled && <ArrowRight className="w-3.5 h-3.5" />}
      </button>
    </div>
  );
}

function StatusDot({ status }: { status: CapturedInvoice["status"] }) {
  const styles: Record<CapturedInvoice["status"], string> = {
    extracted: "bg-brand text-background",
    ready: "bg-amber-500 text-white",
    posted: "bg-emerald-600 text-white",
    error: "bg-rose-600 text-white",
  };
  return <span className={cn("w-2 h-2 rounded-full shrink-0", styles[status])} />;
}
