"use client";
import { AlertTriangle, Ban, ChevronRight, FileText } from "lucide-react";
import { Badge, Card, CardBody, CardHeader } from "../primitives";
import { useStore } from "@/lib/store";
import { vendors } from "@/lib/app-data";
import { money } from "@/lib/utils";

export function DiscrepanciesView({ onOpenInvoice }: { onOpenInvoice: (id: string) => void }) {
  const { invoices } = useStore();
  const flagged = invoices.filter((i) => i.status === "flagged");
  const dupes = invoices.filter((i) => i.status === "duplicate");

  return (
    <div className="p-6 space-y-5 overflow-auto scrollbar-thin">
      <div>
        <div className="text-xs uppercase tracking-wider text-muted">Discrepancies</div>
        <h1 className="text-[24px] font-semibold tracking-tight">Held for your review</h1>
        <p className="text-sm text-muted mt-1">
          Nothing here gets paid until you decide. Drafted vendor responses are ready to send.
        </p>
      </div>

      <Card>
        <CardHeader className="flex items-center justify-between">
          <span className="text-sm font-medium flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-accent" /> Pricing or quantity mismatches
          </span>
          <Badge tone="accent">{flagged.length}</Badge>
        </CardHeader>
        <CardBody className="p-0">
          {flagged.length === 0 ? (
            <div className="px-5 py-8 text-sm text-muted">No discrepancies in the queue. Nice.</div>
          ) : (
            <ul>
              {flagged.map((inv) => (
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
                      <div className="text-xs text-muted truncate">{inv.discrepancyReason}</div>
                    </div>
                    <div className="text-right hidden md:block">
                      <div className="text-sm font-semibold">{money(inv.total)}</div>
                      <div className="text-[11px] text-muted">PO: {money(inv.poTotal ?? 0)}</div>
                    </div>
                    <Badge tone="accent">Needs review</Badge>
                    <ChevronRight className="w-4 h-4 text-muted" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader className="flex items-center justify-between">
          <span className="text-sm font-medium flex items-center gap-2">
            <Ban className="w-4 h-4 text-danger" /> Duplicate invoices blocked
          </span>
          <Badge tone="danger">{dupes.length}</Badge>
        </CardHeader>
        <CardBody className="p-0">
          {dupes.length === 0 ? (
            <div className="px-5 py-8 text-sm text-muted">No duplicates caught today.</div>
          ) : (
            <ul>
              {dupes.map((inv) => (
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
                      <div className="text-xs text-muted truncate">{inv.originalPaidInvoice}</div>
                    </div>
                    <Badge tone="danger">Blocked</Badge>
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
