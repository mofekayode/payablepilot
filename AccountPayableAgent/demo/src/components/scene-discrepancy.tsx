"use client";
import { useEffect, useState } from "react";
import { AlertTriangle, FileText, ClipboardList, Mail, Send } from "lucide-react";
import { Badge, Button, Card, CardBody, CardHeader, Row } from "./primitives";
import { discrepancyInvoice, discrepancyPO, draftedVendorEmail } from "@/lib/demo-data";
import { money } from "@/lib/utils";

export function SceneDiscrepancy() {
  const [stage, setStage] = useState(0);
  useEffect(() => {
    const steps = [400, 1100, 2000, 2900, 3800];
    const timers = steps.map((t, i) => setTimeout(() => setStage(i + 1), t));
    return () => timers.forEach(clearTimeout);
  }, []);

  const inv = discrepancyInvoice;
  const po = discrepancyPO;
  const diff = inv.total - po.total;

  const showInvoice = stage >= 1;
  const showPO = stage >= 2;
  const showFlag = stage >= 3;
  const showEmail = stage >= 4;
  const showNotif = stage >= 5;

  return (
    <div className="min-h-[calc(100vh-56px)] px-6 py-6 bg-surface">
      <div className="grid grid-cols-12 gap-5">
        <div className="col-span-7 flex flex-col gap-4">
          <Card>
            <CardHeader className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-accent" />
                <span className="text-sm font-medium">Reviewing invoice RL-2210 · Reliable Landscaping</span>
              </div>
              {showFlag ? <Badge tone="accent">Discrepancy found</Badge> : <Badge tone="brand">Comparing</Badge>}
            </CardHeader>
          </Card>

          <div className="grid grid-cols-2 gap-4">
            <Card className={showInvoice ? "animate-fade-in-up" : "opacity-0"}>
              <CardHeader className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  <span className="text-sm font-medium">Invoice {inv.invoiceNumber}</span>
                </div>
                <Badge tone="neutral">Received today</Badge>
              </CardHeader>
              <CardBody>
                <LineTable
                  lines={inv.lines}
                  highlightLine={0}
                  highlightTone="accent"
                />
                <Row label="Invoice total" value={<span className="font-semibold">{money(inv.total)}</span>} />
              </CardBody>
            </Card>

            <Card className={showPO ? "animate-fade-in-up" : "opacity-0"}>
              <CardHeader className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ClipboardList className="w-4 h-4" />
                  <span className="text-sm font-medium">Approved PO {po.poNumber}</span>
                </div>
                <Badge tone="brand">On file</Badge>
              </CardHeader>
              <CardBody>
                <LineTable lines={po.lines} highlightLine={0} highlightTone="brand" />
                <Row label="PO total" value={<span className="font-semibold">{money(po.total)}</span>} />
              </CardBody>
            </Card>
          </div>

          {showFlag && (
            <Card className="animate-fade-in-up border-[color:var(--accent)]/40">
              <CardBody>
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-full bg-accent-soft text-accent grid place-items-center">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-semibold">Line 1 price mismatch</div>
                    <div className="text-xs text-muted mt-1">
                      Invoice bills lawn service visits at {money(inv.lines[0].unitPrice)}/unit. Approved PO is{" "}
                      {money(po.lines[0].unitPrice)}/unit. Over-billed by{" "}
                      <span className="text-accent font-medium">{money(diff)}</span>.
                    </div>
                    <div className="mt-3 text-xs text-muted">
                      Payment hold placed. Matched lines can still be released once vendor confirms.
                    </div>
                  </div>
                </div>
              </CardBody>
            </Card>
          )}
        </div>

        <div className="col-span-5 flex flex-col gap-4">
          <Card className={showEmail ? "animate-fade-in-up" : "opacity-0"}>
            <CardHeader className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                <span className="text-sm font-medium">Drafted email to vendor</span>
              </div>
              <Badge tone="brand">Ready to send</Badge>
            </CardHeader>
            <CardBody className="text-sm">
              <Row label="To" value={inv.vendor.email} />
              <Row label="From" value="ap@greenfieldpm.com" />
              <Row label="Subject" value={`Invoice ${inv.invoiceNumber} pricing discrepancy vs PO ${po.poNumber}`} />
              <div className="mt-3 rounded-md border border-border bg-surface p-3 whitespace-pre-wrap font-mono text-[12.5px] leading-relaxed text-foreground">
                {draftedVendorEmail(inv, po)}
              </div>
              <div className="flex items-center gap-2 mt-4">
                <Button>
                  <Send className="w-4 h-4" /> Send now
                </Button>
                <Button variant="outline">Edit draft</Button>
                <span className="ml-auto text-xs text-muted">Auto-send after 10 min if unreviewed</span>
              </div>
            </CardBody>
          </Card>

          {showNotif && (
            <Card className="animate-fade-in-up">
              <CardBody>
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-full bg-accent-soft text-accent grid place-items-center">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div className="flex-1 text-sm">
                    <div className="font-semibold">1 discrepancy needs your review</div>
                    <div className="text-xs text-muted mt-1">
                      Reliable Landscaping · RL-2210 · billed {money(inv.total)}, expected {money(po.total)}. Vendor email
                      drafted and awaiting your send.
                    </div>
                  </div>
                </div>
              </CardBody>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function LineTable({
  lines,
  highlightLine,
  highlightTone,
}: {
  lines: { description: string; qty: number; unitPrice: number }[];
  highlightLine?: number;
  highlightTone?: "brand" | "accent";
}) {
  return (
    <table className="w-full text-[12.5px]">
      <thead>
        <tr className="text-[10px] uppercase tracking-wider text-muted border-b border-border">
          <th className="text-left font-medium py-2">Description</th>
          <th className="text-right font-medium py-2 w-10">Qty</th>
          <th className="text-right font-medium py-2 w-16">Unit</th>
          <th className="text-right font-medium py-2 w-20">Total</th>
        </tr>
      </thead>
      <tbody>
        {lines.map((l, i) => {
          const isH = highlightLine === i;
          const bg =
            isH && highlightTone === "accent"
              ? "bg-accent-soft"
              : isH && highlightTone === "brand"
              ? "bg-brand-soft"
              : "";
          return (
            <tr key={i} className={`${bg} border-b border-border`}>
              <td className="py-2 pr-2">{l.description}</td>
              <td className="py-2 text-right">{l.qty}</td>
              <td className={`py-2 text-right ${isH ? "font-semibold" : ""}`}>{money(l.unitPrice)}</td>
              <td className="py-2 text-right">{money(l.qty * l.unitPrice)}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
