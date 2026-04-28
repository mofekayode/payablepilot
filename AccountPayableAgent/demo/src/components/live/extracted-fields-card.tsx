"use client";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ExtractedInvoice } from "@/lib/use-extract-stream";

// Shared "Extracted by the agent" panel — used by the Inbox detail view AND the
// Upload modal so both surfaces have the same progressive-fields experience
// while Claude is streaming.
export function ExtractedFieldsCard({
  data,
  streaming,
  elapsedMs,
}: {
  data: Partial<ExtractedInvoice>;
  streaming?: boolean;
  elapsedMs?: number | null;
}) {
  const fmt = (n: number | null | undefined) =>
    n == null ? null : new Intl.NumberFormat("en-US", { style: "currency", currency: data.currency || "USD" }).format(n);
  const lineItems = data.line_items ?? [];
  return (
    <div className="rounded-lg border border-brand/30 bg-background overflow-hidden">
      {streaming && (
        <div className="px-4 py-2 bg-brand-soft border-b border-brand/20 flex items-center gap-1.5 text-[11px] uppercase tracking-wider font-semibold text-brand">
          <Sparkles className="w-3 h-3 animate-pulse" />
          Reading invoice…
          {elapsedMs != null && (
            <span className="ml-auto text-muted normal-case tracking-normal font-normal text-[11px]">
              {(elapsedMs / 1000).toFixed(1)}s
            </span>
          )}
        </div>
      )}
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 p-4 text-[13px]">
        <Field label="Vendor" value={data.vendor_name ?? null} streaming={streaming} />
        <Field label="Vendor email" value={data.vendor_email ?? null} streaming={streaming} />
        <Field label="Invoice #" value={data.invoice_number ?? null} streaming={streaming} />
        <Field label="PO #" value={data.po_number ?? null} streaming={streaming} />
        <Field label="Issued" value={data.issue_date ?? null} streaming={streaming} />
        <Field label="Due" value={data.due_date ?? null} streaming={streaming} />
        <Field label="Project / Job" value={data.project_ref ?? null} highlight streaming={streaming} />
        <Field label="Currency" value={data.currency ?? null} streaming={streaming} />
        <Field label="Subtotal" value={fmt(data.subtotal)} streaming={streaming} />
        <Field label="Tax" value={fmt(data.tax)} streaming={streaming} />
        <Field
          label="Total"
          value={fmt(data.total) ? <span className="font-semibold">{fmt(data.total)}</span> : null}
          streaming={streaming}
        />
      </div>
      {lineItems.length > 0 && (
        <div className="border-t border-border">
          <div className="px-4 py-2 text-[11px] uppercase tracking-wider text-muted font-medium">
            Line items ({lineItems.length}){streaming && "…"}
          </div>
          <ul>
            {lineItems.slice(0, 8).map((li, i) => (
              <li key={i} className="flex items-start gap-3 px-4 py-2 border-t border-border text-[12.5px] animate-fade-in-up">
                <div className="flex-1 min-w-0">
                  <div className="truncate">{li.description ?? "…"}</div>
                  {li.project_ref && (
                    <div className="text-[11px] text-brand font-medium">Project: {li.project_ref}</div>
                  )}
                </div>
                <div className="text-muted text-right shrink-0 tabular-nums">
                  {li.quantity != null && `${li.quantity} ×`} {li.unit_price != null && fmt(li.unit_price)}
                </div>
                <div className="text-right shrink-0 tabular-nums w-20">{fmt(li.amount) ?? "…"}</div>
              </li>
            ))}
            {lineItems.length > 8 && (
              <li className="px-4 py-2 text-[11.5px] text-muted">+{lineItems.length - 8} more</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  highlight,
  streaming,
}: {
  label: string;
  value: React.ReactNode;
  highlight?: boolean;
  streaming?: boolean;
}) {
  const empty = value == null || value === "" || value === false;
  return (
    <div className="flex items-baseline gap-2">
      <span className="text-[11px] uppercase tracking-wider text-muted font-medium shrink-0 w-[88px]">{label}</span>
      {empty ? (
        streaming ? (
          <span className="inline-block h-3 w-24 rounded bg-neutral-200 animate-pulse" />
        ) : (
          <span className="text-muted">—</span>
        )
      ) : (
        <span className={cn("truncate", highlight && "text-brand font-semibold")}>{value}</span>
      )}
    </div>
  );
}
