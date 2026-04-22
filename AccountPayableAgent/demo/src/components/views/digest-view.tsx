"use client";
import { Check, AlertTriangle, ShieldCheck, Ban, Inbox, FileSignature } from "lucide-react";
import { useStore } from "@/lib/store";
import { Badge, Button, Card, CardBody, CardHeader } from "../primitives";
import { money, cn } from "@/lib/utils";
import { vendors } from "@/lib/app-data";

export function DigestView() {
  const { invoices, approveBatch } = useStore();

  const matched = invoices.filter((i) => i.status === "matched");
  const flagged = invoices.filter((i) => i.status === "flagged");
  const dupes = invoices.filter((i) => i.status === "duplicate");
  const paid = invoices.filter((i) => i.status === "paid");
  const processed = matched.length + flagged.length + dupes.length + paid.length;
  const matchedTotal = matched.reduce((s, i) => s + i.total, 0);
  const batchDone = matched.length === 0 && paid.length > 0;

  const byVendor = new Map<string, { count: number; total: number; status: "matched" | "flagged" | "mixed" }>();
  for (const inv of invoices) {
    if (inv.status === "inbox" || inv.status === "captured") continue;
    const key = vendors[inv.vendorKey].name;
    const current = byVendor.get(key) ?? { count: 0, total: 0, status: "matched" as const };
    current.count += 1;
    current.total += inv.total;
    if (inv.status === "flagged" || inv.status === "duplicate") current.status = "flagged";
    byVendor.set(key, current);
  }

  return (
    <div className="p-6 space-y-5 overflow-auto scrollbar-thin">
      <div className="flex items-end justify-between">
        <div>
          <div className="text-xs text-muted">Daily digest</div>
          <h1 className="text-[26px] font-semibold tracking-tight">Good morning, Erin.</h1>
          <p className="text-sm text-muted mt-1">Here&apos;s what PayablePilot moved overnight and where your attention matters.</p>
        </div>
        {batchDone ? (
          <Badge tone="brand"><Check className="w-3 h-3" /> Batch released today</Badge>
        ) : matched.length > 0 ? (
          <Button onClick={approveBatch}>
            <ShieldCheck className="w-4 h-4" /> Approve matched · {money(matchedTotal)}
          </Button>
        ) : (
          <Badge tone="neutral">Nothing pending approval</Badge>
        )}
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Stat icon={<Inbox className="w-4 h-4" />} label="Processed" value={String(processed)} sub="so far today" />
        <Stat icon={<Check className="w-4 h-4 text-brand" />} label="Matched & ready" value={String(matched.length)} sub={money(matchedTotal)} tone="brand" />
        <Stat icon={<AlertTriangle className="w-4 h-4 text-accent" />} label="Discrepancies" value={String(flagged.length)} sub="awaiting review" tone="accent" />
        <Stat icon={<Ban className="w-4 h-4 text-danger" />} label="Duplicates blocked" value={String(dupes.length)} sub="no double payment" tone="danger" />
      </div>

      <div className="grid grid-cols-3 gap-5">
        <div className="col-span-2">
          <Card>
            <CardHeader className="flex items-center justify-between">
              <span className="text-sm font-medium flex items-center gap-2">
                <FileSignature className="w-4 h-4" /> By vendor
              </span>
              <Badge tone="neutral">QuickBooks Online</Badge>
            </CardHeader>
            <CardBody className="p-0">
              {byVendor.size === 0 ? (
                <div className="px-5 py-8 text-sm text-muted">Nothing processed yet. Run a few invoices through the queue.</div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-[11px] uppercase tracking-wider text-muted">
                      <th className="text-left font-medium py-2 pl-5">Vendor</th>
                      <th className="text-right font-medium py-2 w-24">Invoices</th>
                      <th className="text-right font-medium py-2 w-28">Amount</th>
                      <th className="text-right font-medium py-2 w-36 pr-5">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from(byVendor.entries()).map(([name, v]) => (
                      <tr key={name} className="border-t border-border">
                        <td className="py-2.5 pl-5">{name}</td>
                        <td className="py-2.5 text-right">{v.count}</td>
                        <td className="py-2.5 text-right font-mono">{money(v.total)}</td>
                        <td className="py-2.5 pr-5 text-right">
                          {v.status === "matched" ? (
                            <Badge tone="brand"><Check className="w-3 h-3" /> Matched</Badge>
                          ) : (
                            <Badge tone="accent"><AlertTriangle className="w-3 h-3" /> Needs review</Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardBody>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader><span className="text-sm font-medium">Pilot activity</span></CardHeader>
            <CardBody className="text-sm space-y-3">
              <Activity when="2:14 AM" text="Captured 4 invoices from ap@greenfieldpm.com inbox." />
              <Activity when="2:15 AM" text="Three-way matched Summit Plumbing SP-4821." />
              <Activity when="2:16 AM" text="Blocked duplicate of Metro Electric ME-0912." />
              <Activity when="2:19 AM" text="Flagged Reliable Landscaping RL-2210." tone="accent" />
              <Activity when="4:02 AM" text="Coded and posted matched invoices to QuickBooks." />
              <Activity when="5:30 AM" text="Sent statement reconciliation request to Hillcrest Builders." />
            </CardBody>
          </Card>
        </div>
      </div>
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
  tone?: "neutral" | "brand" | "accent" | "danger";
}) {
  const ring =
    tone === "brand" ? "ring-[color:var(--brand)]/20"
    : tone === "accent" ? "ring-[color:var(--accent)]/25"
    : tone === "danger" ? "ring-[color:var(--danger)]/20"
    : "ring-transparent";
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

function Activity({ when, text, tone }: { when: string; text: string; tone?: "accent" }) {
  return (
    <div className="flex gap-3">
      <div className="text-[11px] font-mono text-muted w-14 pt-0.5">{when}</div>
      <div className="flex-1">
        <span className={cn("inline-block mr-2 align-middle w-1.5 h-1.5 rounded-full", tone === "accent" ? "bg-accent" : "bg-brand")} />
        <span className="text-foreground">{text}</span>
      </div>
    </div>
  );
}
