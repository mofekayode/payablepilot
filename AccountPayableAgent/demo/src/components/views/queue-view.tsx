"use client";
import { useEffect } from "react";
import { FileText, ChevronRight, ListChecks } from "lucide-react";
import { useStore } from "@/lib/store";
import { Badge, Card, CardBody, CardHeader } from "../primitives";
import { money } from "@/lib/utils";
import { vendors } from "@/lib/app-data";

export function QueueView({ onOpenInvoice }: { onOpenInvoice: (id: string) => void }) {
  const { invoices } = useStore();
  const captured = invoices.filter((i) => i.status === "captured");
  const processed = invoices.filter((i) => ["matched", "flagged", "duplicate"].includes(i.status));

  return (
    <div className="p-6 space-y-5 overflow-auto scrollbar-thin">
      <div>
        <div className="text-xs uppercase tracking-wider text-muted">Processing queue</div>
        <div className="flex items-baseline gap-3">
          <h1 className="text-[24px] font-semibold tracking-tight">Ready for review</h1>
          <span className="text-sm text-muted">{captured.length} waiting · {processed.length} already reviewed</span>
        </div>
      </div>

      <Card>
        <CardHeader className="flex items-center justify-between">
          <span className="text-sm font-medium flex items-center gap-2">
            <ListChecks className="w-4 h-4" /> Captured from inbox
          </span>
          <Badge tone="brand">{captured.length}</Badge>
        </CardHeader>
        <CardBody className="p-0">
          {captured.length === 0 ? (
            <EmptyQueue />
          ) : (
            <ul>
              {captured.map((inv) => (
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
                      <div className="text-xs text-muted truncate">{inv.propertyRef}</div>
                    </div>
                    <div className="hidden md:block text-right">
                      <div className="text-sm font-semibold">{money(inv.total)}</div>
                      <div className="text-[11px] text-muted">Due {inv.dueDate}</div>
                    </div>
                    <Badge tone="neutral">Awaiting match</Badge>
                    <ChevronRight className="w-4 h-4 text-muted" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <span className="text-sm font-medium">Recently reviewed</span>
        </CardHeader>
        <CardBody className="p-0">
          {processed.length === 0 ? (
            <div className="px-5 py-8 text-sm text-muted">Nothing reviewed yet. Click any captured invoice to run the match.</div>
          ) : (
            <ul>
              {processed.map((inv) => (
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
                      <div className="text-xs text-muted truncate">{inv.propertyRef}</div>
                    </div>
                    <div className="hidden md:block text-right">
                      <div className="text-sm font-semibold">{money(inv.total)}</div>
                    </div>
                    {inv.status === "matched" && <Badge tone="brand">Matched</Badge>}
                    {inv.status === "flagged" && <Badge tone="accent">Discrepancy</Badge>}
                    {inv.status === "duplicate" && <Badge tone="danger">Duplicate</Badge>}
                    <ChevronRight className="w-4 h-4 text-muted" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

function EmptyQueue() {
  return (
    <div className="px-5 py-8 text-sm text-muted">
      Nothing captured yet. Go to the <span className="font-medium text-foreground">Inbox</span> and send an invoice to PayablePilot.
    </div>
  );
}

export function useAutoCapture() {
  // placeholder hook if we later want auto-capture animations
  useEffect(() => {}, []);
}
