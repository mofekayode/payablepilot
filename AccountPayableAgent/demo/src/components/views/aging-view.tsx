"use client";
import { Clock, AlertTriangle, Send } from "lucide-react";
import { Badge, Button, Card, CardBody, CardHeader } from "../primitives";
import { agingReport, AgingBucket, vendors } from "@/lib/app-data";
import { money, cn } from "@/lib/utils";

const buckets: { id: AgingBucket; label: string; tone: "brand" | "neutral" | "accent" | "danger" }[] = [
  { id: "current", label: "Current", tone: "brand" },
  { id: "1-30", label: "1-30 days past due", tone: "neutral" },
  { id: "31-60", label: "31-60 days past due", tone: "accent" },
  { id: "61-90", label: "61-90 days past due", tone: "accent" },
  { id: "90+", label: "90+ days past due", tone: "danger" },
];

export function AgingView() {
  const totalsByBucket = new Map<AgingBucket, { count: number; total: number }>();
  for (const r of agingReport) {
    const current = totalsByBucket.get(r.bucket) ?? { count: 0, total: 0 };
    current.count += 1;
    current.total += r.amount;
    totalsByBucket.set(r.bucket, current);
  }
  const grand = agingReport.reduce((s, r) => s + r.amount, 0);

  const byVendor = new Map<string, { total: number; past: number }>();
  for (const r of agingReport) {
    const name = vendors[r.vendorKey].name;
    const current = byVendor.get(name) ?? { total: 0, past: 0 };
    current.total += r.amount;
    if (r.daysPastDue > 0) current.past += r.amount;
    byVendor.set(name, current);
  }

  return (
    <div className="p-6 space-y-5 overflow-auto scrollbar-thin">
      <div>
        <div className="text-xs uppercase tracking-wider text-muted">AP aging</div>
        <h1 className="text-[24px] font-semibold tracking-tight">Who&apos;s owed what, and for how long.</h1>
        <p className="text-sm text-muted mt-1">
          Refreshed from QuickBooks every hour. PayablePilot drafts vendor reminders on invoices past 30 days.
        </p>
      </div>

      <div className="grid grid-cols-5 gap-4">
        {buckets.map((b) => {
          const d = totalsByBucket.get(b.id) ?? { count: 0, total: 0 };
          return <BucketCard key={b.id} label={b.label} count={d.count} total={d.total} tone={b.tone} />;
        })}
      </div>

      <Card>
        <CardHeader className="flex items-center justify-between">
          <span className="text-sm font-medium flex items-center gap-2">
            <Clock className="w-4 h-4" /> All open invoices
          </span>
          <Badge tone="neutral">Total open {money(grand)}</Badge>
        </CardHeader>
        <CardBody className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[11px] uppercase tracking-wider text-muted">
                <th className="text-left font-medium py-2 pl-5">Invoice</th>
                <th className="text-left font-medium py-2">Vendor</th>
                <th className="text-left font-medium py-2">Due</th>
                <th className="text-right font-medium py-2 w-24">Past due</th>
                <th className="text-right font-medium py-2 w-28">Amount</th>
                <th className="text-right font-medium py-2 w-40 pr-5">Bucket</th>
              </tr>
            </thead>
            <tbody>
              {agingReport
                .slice()
                .sort((a, b) => b.daysPastDue - a.daysPastDue)
                .map((r) => (
                  <tr key={r.invoiceNumber} className="border-t border-border">
                    <td className="py-2.5 pl-5 font-mono text-[12.5px]">{r.invoiceNumber}</td>
                    <td className="py-2.5">{vendors[r.vendorKey].name}</td>
                    <td className="py-2.5 text-muted">{r.dueDate}</td>
                    <td className="py-2.5 text-right font-mono">
                      {r.daysPastDue <= 0 ? (
                        <span className="text-muted">in {-r.daysPastDue}d</span>
                      ) : (
                        <span className={cn(r.daysPastDue > 60 ? "text-danger" : "text-accent", "font-medium")}>
                          +{r.daysPastDue}d
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 text-right font-mono">{money(r.amount)}</td>
                    <td className="py-2.5 pr-5 text-right">
                      <BucketBadge bucket={r.bucket} />
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </CardBody>
      </Card>

      <div className="grid grid-cols-2 gap-5">
        <Card>
          <CardHeader>
            <span className="text-sm font-medium">Top exposure by vendor</span>
          </CardHeader>
          <CardBody>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[11px] uppercase tracking-wider text-muted border-b border-border">
                  <th className="text-left font-medium py-2">Vendor</th>
                  <th className="text-right font-medium py-2 w-28">Open</th>
                  <th className="text-right font-medium py-2 w-28">Past due</th>
                </tr>
              </thead>
              <tbody>
                {Array.from(byVendor.entries())
                  .sort((a, b) => b[1].total - a[1].total)
                  .map(([name, d]) => (
                    <tr key={name} className="border-b border-border">
                      <td className="py-2">{name}</td>
                      <td className="py-2 text-right font-mono">{money(d.total)}</td>
                      <td className={cn("py-2 text-right font-mono", d.past > 0 && "text-accent")}>
                        {d.past ? money(d.past) : "—"}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </CardBody>
        </Card>

        <Card>
          <CardHeader className="flex items-center justify-between">
            <span className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-accent" /> Auto-reminders drafted
            </span>
            <Badge tone="accent">3 queued</Badge>
          </CardHeader>
          <CardBody className="text-sm space-y-3">
            <ReminderRow vendor="Allied Insurance" invoice="AI-77182" days={67} />
            <ReminderRow vendor="Reliable Landscaping" invoice="PP-2198" days={89} />
            <ReminderRow vendor="Metro Electric" invoice="ME-0710" days={155} escalated />
            <div className="pt-3 text-xs text-muted">
              Reminders auto-send at 10 AM tomorrow unless you intervene. 90+ day items are CC&apos;d to the property manager.
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

function BucketCard({
  label,
  count,
  total,
  tone,
}: {
  label: string;
  count: number;
  total: number;
  tone: "neutral" | "brand" | "accent" | "danger";
}) {
  const ring =
    tone === "brand"
      ? "ring-[color:var(--brand)]/20"
      : tone === "accent"
      ? "ring-[color:var(--accent)]/25"
      : tone === "danger"
      ? "ring-[color:var(--danger)]/20"
      : "ring-transparent";
  return (
    <div className={cn("rounded-xl border border-border bg-background p-4 ring-1", ring)}>
      <div className="text-[10px] uppercase tracking-wider text-muted">{label}</div>
      <div className="mt-2 text-2xl font-semibold tracking-tight">{money(total)}</div>
      <div className="text-xs text-muted">{count} invoice{count === 1 ? "" : "s"}</div>
    </div>
  );
}

function BucketBadge({ bucket }: { bucket: AgingBucket }) {
  const map: Record<AgingBucket, { tone: "brand" | "neutral" | "accent" | "danger"; label: string }> = {
    current: { tone: "brand", label: "Current" },
    "1-30": { tone: "neutral", label: "1-30" },
    "31-60": { tone: "accent", label: "31-60" },
    "61-90": { tone: "accent", label: "61-90" },
    "90+": { tone: "danger", label: "90+" },
  };
  const b = map[bucket];
  return <Badge tone={b.tone}>{b.label}</Badge>;
}

function ReminderRow({
  vendor,
  invoice,
  days,
  escalated,
}: {
  vendor: string;
  invoice: string;
  days: number;
  escalated?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-3 py-2 rounded-md border border-border bg-surface">
      <div className="min-w-0">
        <div className="text-sm font-medium truncate">
          {vendor} · <span className="font-mono text-[12.5px]">{invoice}</span>
        </div>
        <div className="text-xs text-muted">+{days} days past due{escalated ? " · escalated to property manager" : ""}</div>
      </div>
      <Button variant="outline">
        <Send className="w-3.5 h-3.5" /> Preview
      </Button>
    </div>
  );
}
