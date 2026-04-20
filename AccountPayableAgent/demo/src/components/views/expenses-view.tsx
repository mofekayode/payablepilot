"use client";
import { Receipt, Check, AlertTriangle, Upload, Send } from "lucide-react";
import { Badge, Button, Card, CardBody, CardHeader } from "../primitives";
import { expenseReports, ExpenseReport } from "@/lib/app-data";
import { cn, money } from "@/lib/utils";

export function ExpensesView() {
  const totals = {
    submitted: expenseReports.filter((e) => e.status === "submitted").reduce((s, e) => s + e.total, 0),
    approved: expenseReports.filter((e) => e.status === "approved").reduce((s, e) => s + e.total, 0),
    needsReceipt: expenseReports.filter((e) => e.status === "needs_receipt").length,
    reimbursed: expenseReports.filter((e) => e.status === "reimbursed").reduce((s, e) => s + e.total, 0),
  };

  return (
    <div className="p-6 space-y-5 overflow-auto scrollbar-thin">
      <div>
        <div className="text-xs uppercase tracking-wider text-muted">Expense reports</div>
        <h1 className="text-[24px] font-semibold tracking-tight">Employee receipts, already coded.</h1>
        <p className="text-sm text-muted mt-1">
          Agent extracts each receipt, codes it to the right GL, and asks the employee when something is missing.
        </p>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Stat icon={<Receipt className="w-4 h-4" />} label="Pending approval" value={money(totals.submitted)} sub="waiting for you" />
        <Stat icon={<AlertTriangle className="w-4 h-4 text-accent" />} label="Missing receipts" value={String(totals.needsReceipt)} sub="agent chasing" tone="accent" />
        <Stat icon={<Check className="w-4 h-4 text-brand" />} label="Approved today" value={money(totals.approved)} sub="ready to reimburse" tone="brand" />
        <Stat icon={<Check className="w-4 h-4" />} label="Reimbursed this week" value={money(totals.reimbursed)} sub="sent to payroll" />
      </div>

      <Card>
        <CardHeader className="flex items-center justify-between">
          <span className="text-sm font-medium flex items-center gap-2">
            <Receipt className="w-4 h-4" /> Reports in motion
          </span>
          <Button variant="outline">
            <Upload className="w-4 h-4" /> Forward receipts to agent
          </Button>
        </CardHeader>
        <CardBody className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[11px] uppercase tracking-wider text-muted">
                <th className="text-left font-medium py-2 pl-5">Employee</th>
                <th className="text-left font-medium py-2">Period</th>
                <th className="text-right font-medium py-2 w-20">Items</th>
                <th className="text-right font-medium py-2 w-28">Total</th>
                <th className="text-right font-medium py-2 w-48 pr-5">Status</th>
              </tr>
            </thead>
            <tbody>
              {expenseReports.map((e) => (
                <tr key={e.id} className="border-t border-border">
                  <td className="py-2.5 pl-5">
                    <div className="font-medium">{e.employee}</div>
                    {e.note && <div className="text-xs text-muted">{e.note}</div>}
                  </td>
                  <td className="py-2.5 text-muted">{e.periodEnd}</td>
                  <td className="py-2.5 text-right">{e.items}</td>
                  <td className="py-2.5 text-right font-mono">{money(e.total)}</td>
                  <td className="py-2.5 pr-5 text-right">
                    <StatusBadge status={e.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <span className="text-sm font-medium">Category breakdown · Erin Boyd (current report)</span>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-4 gap-4">
            {(expenseReports.find((e) => e.status === "submitted")?.categoryBreakdown ?? []).map((c) => (
              <div key={c.label} className="rounded-lg border border-border bg-surface p-3">
                <div className="text-[10px] uppercase tracking-wider text-muted">{c.label}</div>
                <div className="text-lg font-semibold">{money(c.amount)}</div>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2 mt-4">
            <Button>
              <Check className="w-4 h-4" /> Approve report
            </Button>
            <Button variant="outline">
              <Send className="w-4 h-4" /> Push back for edits
            </Button>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
  sub,
  tone = "neutral",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  tone?: "neutral" | "brand" | "accent";
}) {
  const ring =
    tone === "brand" ? "ring-[color:var(--brand)]/20" : tone === "accent" ? "ring-[color:var(--accent)]/25" : "ring-transparent";
  return (
    <div className={cn("rounded-xl border border-border bg-background p-4 ring-1", ring)}>
      <div className="flex items-center justify-between text-muted text-xs">
        <span className="uppercase tracking-wider">{label}</span>
        {icon}
      </div>
      <div className="mt-2 text-2xl font-semibold tracking-tight">{value}</div>
      <div className="text-xs text-muted">{sub}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: ExpenseReport["status"] }) {
  if (status === "submitted") return <Badge tone="neutral">Pending your approval</Badge>;
  if (status === "needs_receipt") return <Badge tone="accent"><AlertTriangle className="w-3 h-3" /> Missing receipt</Badge>;
  if (status === "approved") return <Badge tone="brand"><Check className="w-3 h-3" /> Approved</Badge>;
  return <Badge tone="brand"><Check className="w-3 h-3" /> Reimbursed</Badge>;
}
