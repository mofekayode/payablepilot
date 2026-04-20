"use client";
import { useState } from "react";
import { Check, CreditCard, FileText, ShieldCheck } from "lucide-react";
import { useStore } from "@/lib/store";
import { Badge, Button, Card, CardBody, CardHeader, Row } from "../primitives";
import { money } from "@/lib/utils";
import { vendors } from "@/lib/app-data";

export function BatchView({ onOpenInvoice }: { onOpenInvoice: (id: string) => void }) {
  const { invoices, approveBatch } = useStore();
  const matched = invoices.filter((i) => i.status === "matched");
  const paid = invoices.filter((i) => i.status === "paid");
  const batchTotal = matched.reduce((s, i) => s + i.total, 0);

  const [step, setStep] = useState<"idle" | "posting" | "done">("idle");

  const onApprove = () => {
    if (matched.length === 0) return;
    setStep("posting");
    setTimeout(() => {
      approveBatch();
      setStep("done");
    }, 1500);
  };

  return (
    <div className="p-6 space-y-5 overflow-auto scrollbar-thin">
      <div className="flex items-end justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-wider text-muted">Payment batch</div>
          <h1 className="text-[24px] font-semibold tracking-tight">Ready to release</h1>
          <p className="text-sm text-muted mt-1">
            Matched invoices only. Nothing here moves until you approve.
          </p>
        </div>
        {step === "done" ? (
          <Badge tone="brand">
            <Check className="w-3 h-3" /> Batch released to QuickBooks
          </Badge>
        ) : step === "posting" ? (
          <Button disabled>
            <span className="w-2 h-2 rounded-full bg-white animate-pulse-soft" /> Posting to QuickBooks…
          </Button>
        ) : (
          <Button onClick={onApprove} disabled={matched.length === 0}>
            <ShieldCheck className="w-4 h-4" /> Approve batch · {money(batchTotal)}
          </Button>
        )}
      </div>

      <Card>
        <CardHeader className="flex items-center justify-between">
          <span className="text-sm font-medium flex items-center gap-2">
            <CreditCard className="w-4 h-4" /> In this batch
          </span>
          <Badge tone="neutral">QuickBooks Online</Badge>
        </CardHeader>
        <CardBody className="p-0">
          {matched.length === 0 ? (
            <div className="px-5 py-8 text-sm text-muted">Nothing matched yet. Process invoices from the queue first.</div>
          ) : (
            <ul>
              {matched.map((inv) => (
                <li key={inv.id}>
                  <button
                    onClick={() => onOpenInvoice(inv.id)}
                    className="w-full flex items-center gap-4 px-5 py-3 border-b border-border hover:bg-surface text-left"
                  >
                    <div className="w-9 h-9 rounded bg-surface grid place-items-center shrink-0">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium truncate">
                        {vendors[inv.vendorKey].name} · {inv.invoiceNumber}
                      </div>
                      <div className="text-xs text-muted truncate">
                        {inv.suggestedGL.code} · {inv.suggestedGL.label} · Due {inv.dueDate}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold">{money(inv.total)}</div>
                    </div>
                    <Badge tone="brand">Matched</Badge>
                  </button>
                </li>
              ))}
              <li>
                <div className="flex items-center justify-end gap-4 px-5 py-3 bg-surface">
                  <Row label="Batch total" value={<span className="font-semibold">{money(batchTotal)}</span>} />
                </div>
              </li>
            </ul>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <span className="text-sm font-medium">Paid today</span>
        </CardHeader>
        <CardBody className="p-0">
          {paid.length === 0 ? (
            <div className="px-5 py-8 text-sm text-muted">No payments released yet today.</div>
          ) : (
            <ul>
              {paid.map((inv) => (
                <li key={inv.id} className="flex items-center gap-4 px-5 py-3 border-b border-border">
                  <div className="w-9 h-9 rounded bg-brand-soft text-brand grid place-items-center shrink-0">
                    <Check className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">
                      {vendors[inv.vendorKey].name} · {inv.invoiceNumber}
                    </div>
                    <div className="text-xs text-muted truncate">Posted to {inv.suggestedGL.code} · {inv.suggestedGL.label}</div>
                  </div>
                  <div className="text-sm font-semibold">{money(inv.total)}</div>
                  <Badge tone="brand">Sent to QBO</Badge>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
