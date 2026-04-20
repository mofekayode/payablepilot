"use client";
import { useEffect, useMemo, useState } from "react";
import { Check, FileText, ClipboardList, PackageCheck, Sparkles } from "lucide-react";
import { Badge, Card, CardBody, CardHeader, Row } from "./primitives";
import { matchedInvoice, matchedPO, matchedReceiving } from "@/lib/demo-data";
import { money } from "@/lib/utils";

export function SceneMatch() {
  const [stage, setStage] = useState(0);
  useEffect(() => {
    const steps = [300, 900, 1600, 2400, 3200, 4100];
    const timers = steps.map((t, i) => setTimeout(() => setStage(i + 1), t));
    return () => timers.forEach(clearTimeout);
  }, []);

  const showExtract = stage >= 1;
  const showInvoiceCard = stage >= 2;
  const showPOCard = stage >= 3;
  const showReceivingCard = stage >= 4;
  const showMatched = stage >= 5;
  const showCoded = stage >= 6;

  const inv = matchedInvoice;
  const po = matchedPO;
  const rec = matchedReceiving;

  const invTotal = useMemo(() => inv.lines.reduce((s, l) => s + l.qty * l.unitPrice, 0), [inv.lines]);

  return (
    <div className="min-h-[calc(100vh-56px)] px-6 py-6 grid grid-cols-12 gap-5 bg-surface">
      <div className="col-span-4">
        <InvoicePDF invoice={inv} />
      </div>

      <div className="col-span-8 flex flex-col gap-4">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-brand" />
                <span className="text-sm font-medium">Agent working on SP-4821</span>
              </div>
              <Badge tone="brand">
                <span className="w-1.5 h-1.5 rounded-full bg-brand animate-pulse-soft" />
                Processing
              </Badge>
            </div>
          </CardHeader>
          <CardBody>
            <div className="space-y-2 text-sm">
              <AgentStep done={showExtract} label="Reading PDF and extracting fields" />
              <AgentStep done={showInvoiceCard} label="Identifying vendor and invoice number" />
              <AgentStep done={showPOCard} label="Locating matching purchase order" />
              <AgentStep done={showReceivingCard} label="Retrieving receiving confirmation" />
              <AgentStep done={showMatched} label="Running three-way match" />
              <AgentStep done={showCoded} label="Posting to GL and queuing for approval" />
            </div>
          </CardBody>
        </Card>

        <div className="grid grid-cols-3 gap-4">
          <DocCard
            icon={<FileText className="w-4 h-4" />}
            title="Invoice"
            badge="Extracted"
            show={showInvoiceCard}
          >
            <Row label="Vendor" value={inv.vendor.name} />
            <Row label="Invoice #" value={inv.invoiceNumber} mono />
            <Row label="PO reference" value={inv.poNumber} mono />
            <Row label="Property" value={inv.propertyRef} />
            <Row label="Subtotal" value={money(invTotal)} />
            <Row label="Total" value={<span className="text-foreground font-semibold">{money(invTotal)}</span>} />
          </DocCard>

          <DocCard
            icon={<ClipboardList className="w-4 h-4" />}
            title="Purchase order"
            badge="In QuickBooks"
            show={showPOCard}
          >
            <Row label="PO #" value={po.poNumber} mono />
            <Row label="Approved by" value={po.approvedBy} />
            <Row label="Approved" value={po.approvedOn} />
            <Row label="Lines" value={po.lines.length} />
            <Row label="Total" value={money(po.total)} />
          </DocCard>

          <DocCard
            icon={<PackageCheck className="w-4 h-4" />}
            title="Receiving"
            badge="Signed"
            show={showReceivingCard}
          >
            <Row label="Received on" value={rec.receivedOn} />
            <Row label="Signed by" value={rec.signedBy} />
            <Row label="Items" value={rec.itemsReceived.length} />
            <Row label="Status" value={<span className="text-brand font-medium">Complete</span>} />
          </DocCard>
        </div>

        {showMatched && (
          <Card className="animate-fade-in-up border-[color:var(--brand)]/30">
            <CardBody>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-brand text-white grid place-items-center">
                    <Check className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold">Three-way match confirmed</div>
                    <div className="text-xs text-muted">
                      Invoice {inv.invoiceNumber} matches PO {po.poNumber} and receiving on {rec.receivedOn}. No human
                      action required.
                    </div>
                  </div>
                </div>
                {showCoded && (
                  <div className="flex items-center gap-3 animate-fade-in-up">
                    <div className="text-right">
                      <div className="text-xs text-muted">Posted to</div>
                      <div className="text-sm font-medium">
                        {inv.glCode} · {inv.glLabel}
                      </div>
                    </div>
                    <Badge tone="brand">Queued</Badge>
                  </div>
                )}
              </div>
            </CardBody>
          </Card>
        )}
      </div>
    </div>
  );
}

function AgentStep({ done, label }: { done: boolean; label: string }) {
  return (
    <div className="flex items-center gap-3">
      <div
        className={`w-5 h-5 rounded-full grid place-items-center border ${
          done ? "bg-brand border-brand text-white" : "border-border text-muted"
        }`}
      >
        {done ? <Check className="w-3 h-3" /> : <span className="w-1 h-1 rounded-full bg-muted" />}
      </div>
      <span className={done ? "text-foreground" : "text-muted"}>{label}</span>
    </div>
  );
}

function DocCard({
  icon,
  title,
  badge,
  show,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  badge: string;
  show: boolean;
  children: React.ReactNode;
}) {
  return (
    <Card className={show ? "animate-fade-in-up" : "opacity-0"}>
      <CardHeader className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-sm font-medium">{title}</span>
        </div>
        <Badge tone="brand">{badge}</Badge>
      </CardHeader>
      <CardBody>{children}</CardBody>
    </Card>
  );
}

function InvoicePDF({ invoice }: { invoice: typeof matchedInvoice }) {
  const total = invoice.lines.reduce((s, l) => s + l.qty * l.unitPrice, 0);
  return (
    <div className="sticky top-4 rounded-xl shadow-[0_8px_40px_rgba(27,42,74,0.08)] border border-border bg-white overflow-hidden">
      <div className="h-2 bg-brand" />
      <div className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-[11px] tracking-[0.2em] font-semibold text-muted">INVOICE</div>
            <div className="text-2xl font-semibold mt-1">{invoice.vendor.name}</div>
            <div className="text-xs text-muted mt-1">{invoice.vendor.email}</div>
          </div>
          <div className="text-right text-xs text-muted">
            <div>Invoice #: {invoice.invoiceNumber}</div>
            <div>Issued: {invoice.issueDate}</div>
            <div>Due: {invoice.dueDate}</div>
          </div>
        </div>

        <div className="mt-6 text-xs text-muted">Bill to</div>
        <div className="text-sm font-medium">Greenfield Property Management</div>
        <div className="text-xs text-muted">{invoice.propertyRef}</div>
        <div className="text-xs text-muted">Ref PO: {invoice.poNumber}</div>

        <table className="w-full mt-5 text-sm">
          <thead>
            <tr className="text-[11px] text-muted uppercase tracking-wider border-b border-border">
              <th className="text-left font-medium py-2">Description</th>
              <th className="text-right font-medium py-2 w-14">Qty</th>
              <th className="text-right font-medium py-2 w-20">Unit</th>
              <th className="text-right font-medium py-2 w-20">Total</th>
            </tr>
          </thead>
          <tbody>
            {invoice.lines.map((l, i) => (
              <tr key={i} className="border-b border-border">
                <td className="py-2 pr-2">{l.description}</td>
                <td className="py-2 text-right">{l.qty}</td>
                <td className="py-2 text-right">{money(l.unitPrice)}</td>
                <td className="py-2 text-right">{money(l.qty * l.unitPrice)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td className="py-3" />
              <td />
              <td className="py-3 text-right text-muted text-xs">Total due</td>
              <td className="py-3 text-right font-semibold">{money(total)}</td>
            </tr>
          </tfoot>
        </table>

        <div className="mt-4 text-[11px] text-muted">Terms: {invoice.vendor.terms} · Questions: {invoice.vendor.email}</div>
      </div>
    </div>
  );
}
