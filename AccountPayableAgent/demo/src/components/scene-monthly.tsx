"use client";
import { Clock, FileSpreadsheet, ReceiptText, Receipt, CalendarCheck, CreditCard, Sparkles } from "lucide-react";
import { Card, CardBody, CardHeader, Badge } from "./primitives";
import { money } from "@/lib/utils";

export function SceneMonthly() {
  return (
    <div className="min-h-[calc(100vh-56px)] px-6 py-6 bg-surface overflow-auto">
      <div className="max-w-[1180px] mx-auto">
        <div className="mb-5">
          <div className="text-xs uppercase tracking-wider text-muted">Beyond today&apos;s inbox</div>
          <h1 className="text-[28px] font-semibold tracking-tight">Monthly and yearly AP, running in the background.</h1>
          <p className="text-sm text-muted mt-1">
            Everything your AP clerk does on a cycle, PayablePilot handles without a reminder.
          </p>
        </div>

        <div className="grid grid-cols-6 gap-4">
          <MonthlyCard
            icon={<Clock className="w-4 h-4" />}
            label="AP aging"
            primary="$10,395"
            secondary="3 past 30 days, 1 past 90"
            tone="accent"
          />
          <MonthlyCard
            icon={<FileSpreadsheet className="w-4 h-4" />}
            label="Vendor statements"
            primary="2 / 3 reconciled"
            secondary="Reliable variance $340"
          />
          <MonthlyCard
            icon={<ReceiptText className="w-4 h-4" />}
            label="W-9 & 1099"
            primary="1 W-9 missing"
            secondary="3 vendors over $600"
            tone="accent"
          />
          <MonthlyCard
            icon={<CreditCard className="w-4 h-4" />}
            label="Card recon"
            primary="6 charges"
            secondary="1 missing receipt"
            tone="accent"
          />
          <MonthlyCard
            icon={<Receipt className="w-4 h-4" />}
            label="Expense reports"
            primary="4 in flight"
            secondary={`${money(1764.25)} pending`}
          />
          <MonthlyCard
            icon={<CalendarCheck className="w-4 h-4" />}
            label="Month-end close"
            primary="5 of 8 done"
            secondary="3 items need Erin"
            tone="brand"
          />
        </div>

        <div className="grid grid-cols-3 gap-5 mt-5">
          <Card>
            <CardHeader className="flex items-center justify-between">
              <span className="text-sm font-medium flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-brand" /> Last 24 hours
              </span>
              <Badge tone="brand">18 actions</Badge>
            </CardHeader>
            <CardBody className="text-sm space-y-3">
              <Activity t="5:30 AM" text="Emailed Metro Electric a W-9 request" />
              <Activity t="4:08 AM" text="Reconciled Summit April statement, no variance" />
              <Activity t="2:19 AM" text="Flagged Reliable RL-2210 pricing discrepancy" tone="accent" />
              <Activity t="2:15 AM" text="Three-way matched 10 invoices, posted to the GL" />
              <Activity t="Yesterday 6:45 AM" text="Sent aging reminder to Allied on AI-77182" />
            </CardBody>
          </Card>

          <Card className="col-span-2">
            <CardHeader>
              <span className="text-sm font-medium">Email trail on your behalf</span>
            </CardHeader>
            <CardBody className="p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[11px] uppercase tracking-wider text-muted">
                    <th className="text-left font-medium py-2 pl-5">Category</th>
                    <th className="text-left font-medium py-2">Recipient</th>
                    <th className="text-left font-medium py-2">Subject</th>
                    <th className="text-right font-medium py-2 w-32 pr-5">Status</th>
                  </tr>
                </thead>
                <tbody>
                  <MailRow cat="Discrepancy" to="Reliable Landscaping" subject="Invoice RL-2210 pricing vs PO-1055" status="awaiting" />
                  <MailRow cat="Duplicate" to="Metro Electric" subject="ME-0912 already paid on 2026-04-12" status="replied" />
                  <MailRow cat="Receipt" to="Erin Boyd" subject="Receipt needed: Staples $67.90" status="awaiting" />
                  <MailRow cat="Reconciliation" to="Summit Plumbing" subject="April statement reconciled, thank you" status="sent" />
                  <MailRow cat="W-9 request" to="Metro Electric" subject="W-9 needed for 2026 records" status="awaiting" />
                  <MailRow cat="Aging reminder" to="Allied Insurance" subject="AI-77182 past due reminder" status="replied" />
                </tbody>
              </table>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}

function MonthlyCard({
  icon,
  label,
  primary,
  secondary,
  tone = "neutral",
}: {
  icon: React.ReactNode;
  label: string;
  primary: string;
  secondary: string;
  tone?: "neutral" | "brand" | "accent";
}) {
  const ring =
    tone === "brand"
      ? "ring-[color:var(--brand)]/25"
      : tone === "accent"
      ? "ring-[color:var(--accent)]/30"
      : "ring-transparent";
  return (
    <div className={`rounded-xl border border-border bg-background p-4 ring-1 ${ring}`}>
      <div className="flex items-center justify-between text-muted text-xs">
        <span className="uppercase tracking-wider">{label}</span>
        {icon}
      </div>
      <div className="mt-2 text-[20px] font-semibold tracking-tight">{primary}</div>
      <div className="text-xs text-muted">{secondary}</div>
    </div>
  );
}

function Activity({ t, text, tone }: { t: string; text: string; tone?: "accent" }) {
  return (
    <div className="flex gap-3">
      <div className="text-[11px] font-mono text-muted w-24 pt-0.5">{t}</div>
      <div className="flex-1">
        <span className={`inline-block mr-2 align-middle w-1.5 h-1.5 rounded-full ${tone === "accent" ? "bg-accent" : "bg-brand"}`} />
        <span className="text-foreground">{text}</span>
      </div>
    </div>
  );
}

function MailRow({ cat, to, subject, status }: { cat: string; to: string; subject: string; status: "sent" | "awaiting" | "replied" }) {
  return (
    <tr className="border-t border-border">
      <td className="py-2.5 pl-5 text-xs text-muted">{cat}</td>
      <td className="py-2.5">{to}</td>
      <td className="py-2.5 text-muted truncate">{subject}</td>
      <td className="py-2.5 pr-5 text-right">
        {status === "sent" && <Badge tone="neutral">Sent</Badge>}
        {status === "awaiting" && <Badge tone="accent">Awaiting reply</Badge>}
        {status === "replied" && <Badge tone="brand">Replied</Badge>}
      </td>
    </tr>
  );
}
