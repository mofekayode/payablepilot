"use client";
import { useEffect, useState } from "react";
import { Check, AlertTriangle, ShieldCheck, Clock, Ban, Inbox, FileSignature } from "lucide-react";
import { Badge, Button, Card, CardBody, CardHeader } from "./primitives";
import { digest } from "@/lib/demo-data";
import { money, cn } from "@/lib/utils";

export function SceneDigest() {
  const [approving, setApproving] = useState(false);
  const [approved, setApproved] = useState(false);

  useEffect(() => {
    if (!approving) return;
    const t = setTimeout(() => setApproved(true), 1400);
    return () => clearTimeout(t);
  }, [approving]);

  return (
    <div className="min-h-[calc(100vh-56px)] px-6 py-6 bg-surface">
      <div className="max-w-[1180px] mx-auto">
        <div className="flex items-end justify-between mb-5">
          <div>
            <div className="text-xs text-muted">Daily AP digest</div>
            <h1 className="text-[28px] font-semibold tracking-tight">Good morning, Erin.</h1>
            <p className="text-sm text-muted mt-1">
              {digest.date} · PayablePilot worked overnight. Here is everything that needs your attention.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {!approved ? (
              <Button onClick={() => setApproving(true)} disabled={approving}>
                {approving ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-white animate-pulse-soft" /> Sending to bank…
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    Approve payment batch · {money(digest.matchedTotal)}
                  </>
                )}
              </Button>
            ) : (
              <Badge tone="brand">
                <Check className="w-3 h-3" />
                Batch approved · {money(digest.matchedTotal)}
              </Badge>
            )}
          </div>
        </div>

        <div className="grid grid-cols-5 gap-4 mb-6">
          <Stat
            icon={<Inbox className="w-4 h-4" />}
            label="Invoices processed"
            value={String(digest.invoicesProcessed)}
            sub="since 6:00 PM yesterday"
          />
          <Stat
            icon={<Check className="w-4 h-4 text-brand" />}
            label="Matched & ready"
            value={`${digest.matched}`}
            sub={money(digest.matchedTotal)}
            tone="brand"
          />
          <Stat
            icon={<AlertTriangle className="w-4 h-4 text-accent" />}
            label="Discrepancies"
            value={String(digest.discrepancies)}
            sub="awaiting your review"
            tone="accent"
          />
          <Stat
            icon={<Ban className="w-4 h-4 text-danger" />}
            label="Duplicates blocked"
            value={String(digest.duplicatesBlocked)}
            sub="no double payment"
            tone="danger"
          />
          <Stat
            icon={<Clock className="w-4 h-4" />}
            label="Aging >30 days"
            value={String(digest.overdue30)}
            sub="follow-up drafted"
          />
        </div>

        <div className="grid grid-cols-3 gap-5">
          <div className="col-span-2">
            <Card>
              <CardHeader className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileSignature className="w-4 h-4" />
                  <span className="text-sm font-medium">Today&apos;s batch · by vendor</span>
                </div>
                <Badge tone="neutral">QuickBooks Online</Badge>
              </CardHeader>
              <CardBody className="p-0">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-[11px] uppercase tracking-wider text-muted">
                      <th className="text-left font-medium py-2 pl-5">Vendor</th>
                      <th className="text-right font-medium py-2 w-20">Invoices</th>
                      <th className="text-right font-medium py-2 w-28">Amount</th>
                      <th className="text-right font-medium py-2 w-36 pr-5">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {digest.byVendor.map((v) => (
                      <tr key={v.vendor} className="border-t border-border">
                        <td className="py-2.5 pl-5">{v.vendor}</td>
                        <td className="py-2.5 text-right">{v.count}</td>
                        <td className="py-2.5 text-right font-mono">{money(v.total)}</td>
                        <td className="py-2.5 pr-5 text-right">
                          {v.status === "matched" ? (
                            <Badge tone="brand">
                              <Check className="w-3 h-3" /> Matched
                            </Badge>
                          ) : (
                            <Badge tone="accent">
                              <AlertTriangle className="w-3 h-3" /> Needs review
                            </Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardBody>
            </Card>
          </div>

          <div>
            <Card>
              <CardHeader>
                <span className="text-sm font-medium">Pilot activity overnight</span>
              </CardHeader>
              <CardBody className="text-sm space-y-3">
                <Activity
                  when="2:14 AM"
                  text="Captured 4 invoices from ap@greenfieldpm.com inbox."
                />
                <Activity
                  when="2:15 AM"
                  text="Three-way matched Summit Plumbing SP-4821 · $399."
                />
                <Activity
                  when="2:16 AM"
                  text="Blocked duplicate of Metro Electric ME-0912 (already paid 4/10)."
                />
                <Activity
                  when="2:19 AM"
                  text="Flagged Reliable Landscaping RL-2210 for pricing vs PO-1055."
                  tone="accent"
                />
                <Activity
                  when="4:02 AM"
                  text="Posted 10 invoices to QuickBooks, coded to Repairs, Grounds, Electrical, Insurance."
                />
                <Activity
                  when="5:30 AM"
                  text="Sent statement reconciliation request to Hillcrest Builders."
                />
              </CardBody>
            </Card>
          </div>
        </div>

        {approved && (
          <div className="mt-6 animate-fade-in-up">
            <Card className="border-[color:var(--brand)]/30">
              <CardBody>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-brand text-white grid place-items-center">
                    <Check className="w-5 h-5" />
                  </div>
                  <div className="flex-1 text-sm">
                    <div className="font-semibold">Payment batch released to QuickBooks</div>
                    <div className="text-xs text-muted">
                      {digest.matched} payments queued · {money(digest.matchedTotal)} total · settlement Monday.
                      Remittance advice drafted for each vendor.
                    </div>
                  </div>
                  <Badge tone="brand">You approved</Badge>
                </div>
              </CardBody>
            </Card>
          </div>
        )}
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
    tone === "brand"
      ? "ring-[color:var(--brand)]/20"
      : tone === "accent"
      ? "ring-[color:var(--accent)]/25"
      : tone === "danger"
      ? "ring-[color:var(--danger)]/20"
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
        <span
          className={cn(
            "inline-block mr-2 align-middle w-1.5 h-1.5 rounded-full",
            tone === "accent" ? "bg-accent" : "bg-brand"
          )}
        />
        <span className="text-foreground">{text}</span>
      </div>
    </div>
  );
}
