"use client";
import {
  Inbox,
  ListChecks,
  AlertTriangle,
  CreditCard,
  Users,
  LayoutDashboard,
  Film,
  Clock,
  FileSpreadsheet,
  ReceiptText,
  Receipt,
  CalendarCheck,
  Send,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { vendorCompliance, agingReport, expenseReports, cardTransactions, monthEnd, statements, outbox } from "@/lib/app-data";
import Link from "next/link";
import { PilotMark } from "./pilot-mark";

export type ViewId =
  | "digest"
  | "outbox"
  | "inbox"
  | "queue"
  | "discrepancies"
  | "batch"
  | "aging"
  | "statements"
  | "close"
  | "compliance"
  | "expenses"
  | "cards"
  | "vendors";

export function Sidebar({
  active,
  onSelect,
}: {
  active: ViewId;
  onSelect: (id: ViewId) => void;
}) {
  const { emails, invoices } = useStore();
  const unreadInbox = emails.filter((e) => e.unread).length;
  const queueCount = invoices.filter((i) => i.status === "captured").length;
  const discrepancyCount = invoices.filter((i) => i.status === "flagged" || i.status === "duplicate").length;
  const batchCount = invoices.filter((i) => i.status === "matched").length;

  const agingOverdue = agingReport.filter((a) => a.daysPastDue > 0).length;
  const statementsOpen = statements.filter((s) => s.status !== "reconciled").length;
  const closePending = monthEnd.tasks.filter((t) => t.status !== "done").length;
  const missingW9 = vendorCompliance.filter((v) => !v.w9OnFile).length;
  const expensesPending = expenseReports.filter((e) => e.status === "submitted" || e.status === "needs_receipt").length;
  const cardFlags = cardTransactions.filter((c) => c.status === "missing_receipt" || c.status === "flagged").length;
  const outboxAwaiting = outbox.filter((o) => o.status === "awaiting_reply").length;

  return (
    <aside className="w-[248px] shrink-0 border-r border-border bg-background flex flex-col">
      <div className="px-4 py-4 flex items-center gap-3 border-b border-border">
        <div className="w-9 h-9 rounded-md bg-foreground text-background grid place-items-center">
          <PilotMark className="w-4 h-4" />
        </div>
        <div>
          <div className="text-[15px] font-semibold tracking-tight">PayablePilot</div>
          <div className="text-[11px] text-muted">Greenfield PM</div>
        </div>
      </div>

      <div className="flex-1 overflow-auto scrollbar-thin py-2">
        <Group label="Overview">
          <NavItem
            icon={<LayoutDashboard className="w-4 h-4" />}
            label="Daily digest"
            active={active === "digest"}
            onClick={() => onSelect("digest")}
          />
          <NavItem
            icon={<Send className="w-4 h-4" />}
            label="Agent outbox"
            badge={outboxAwaiting || undefined}
            active={active === "outbox"}
            onClick={() => onSelect("outbox")}
          />
        </Group>

        <Group label="Work">
          <NavItem
            icon={<Inbox className="w-4 h-4" />}
            label="Inbox"
            badge={unreadInbox || undefined}
            active={active === "inbox"}
            onClick={() => onSelect("inbox")}
          />
          <NavItem
            icon={<ListChecks className="w-4 h-4" />}
            label="Processing queue"
            badge={queueCount || undefined}
            active={active === "queue"}
            onClick={() => onSelect("queue")}
          />
          <NavItem
            icon={<AlertTriangle className="w-4 h-4" />}
            label="Discrepancies"
            badge={discrepancyCount || undefined}
            tone="accent"
            active={active === "discrepancies"}
            onClick={() => onSelect("discrepancies")}
          />
          <NavItem
            icon={<CreditCard className="w-4 h-4" />}
            label="Bills to post"
            badge={batchCount || undefined}
            tone="brand"
            active={active === "batch"}
            onClick={() => onSelect("batch")}
          />
        </Group>

        <Group label="Reports">
          <NavItem
            icon={<Clock className="w-4 h-4" />}
            label="AP aging"
            badge={agingOverdue || undefined}
            tone="accent"
            active={active === "aging"}
            onClick={() => onSelect("aging")}
          />
          <NavItem
            icon={<FileSpreadsheet className="w-4 h-4" />}
            label="Vendor statements"
            badge={statementsOpen || undefined}
            active={active === "statements"}
            onClick={() => onSelect("statements")}
          />
          <NavItem
            icon={<CalendarCheck className="w-4 h-4" />}
            label="Month-end close"
            badge={closePending || undefined}
            active={active === "close"}
            onClick={() => onSelect("close")}
          />
        </Group>

        <Group label="Compliance">
          <NavItem
            icon={<ReceiptText className="w-4 h-4" />}
            label="W-9 & 1099"
            badge={missingW9 || undefined}
            tone="accent"
            active={active === "compliance"}
            onClick={() => onSelect("compliance")}
          />
          <NavItem
            icon={<Receipt className="w-4 h-4" />}
            label="Expense reports"
            badge={expensesPending || undefined}
            active={active === "expenses"}
            onClick={() => onSelect("expenses")}
          />
          <NavItem
            icon={<CreditCard className="w-4 h-4" />}
            label="Card recon"
            badge={cardFlags || undefined}
            tone="accent"
            active={active === "cards"}
            onClick={() => onSelect("cards")}
          />
        </Group>

        <Group label="Reference">
          <NavItem
            icon={<Users className="w-4 h-4" />}
            label="Vendors"
            active={active === "vendors"}
            onClick={() => onSelect("vendors")}
          />
        </Group>
      </div>

      <div className="p-3 border-t border-border">
        <Link
          href="/tour"
          className="flex items-center gap-2 text-xs text-muted hover:text-foreground px-3 py-2 rounded-md border border-border bg-surface"
        >
          <Film className="w-3.5 h-3.5" />
          Watch the guided tour
        </Link>
        <div className="mt-3 p-3 rounded-lg border border-border bg-surface">
          <div className="flex items-center gap-2 text-[11px]">
            <span className="w-1.5 h-1.5 rounded-full bg-brand" />
            <span className="font-medium">QuickBooks Online</span>
          </div>
          <div className="text-[11px] text-muted mt-1">Connected · syncing</div>
        </div>
      </div>
    </aside>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="px-3 pt-3">
      <div className="px-2 pb-1 text-[10px] uppercase tracking-[0.12em] text-muted font-semibold">{label}</div>
      <div className="flex flex-col gap-0.5">{children}</div>
    </div>
  );
}

function NavItem({
  icon,
  label,
  badge,
  tone = "neutral",
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  badge?: number;
  tone?: "neutral" | "brand" | "accent";
  active?: boolean;
  onClick?: () => void;
}) {
  const badgeClass =
    tone === "brand"
      ? "bg-brand-soft text-[#1f2937]"
      : tone === "accent"
      ? "bg-accent-soft text-[#1f2937]"
      : "bg-surface text-[#1f2937] border border-border";
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center justify-between gap-2 px-3 py-2 rounded-md text-[13.5px]",
        active ? "bg-surface text-foreground font-medium" : "text-muted hover:text-foreground hover:bg-surface"
      )}
    >
      <span className="flex items-center gap-2">
        {icon}
        {label}
      </span>
      {badge !== undefined && (
        <span
          className={cn(
            "text-[10.5px] font-semibold min-w-[18px] h-[18px] px-1.5 rounded-full grid place-items-center",
            badgeClass
          )}
        >
          {badge}
        </span>
      )}
    </button>
  );
}
