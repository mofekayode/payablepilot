"use client";
import { useEffect, useMemo, useState } from "react";
import { Paperclip, Search, Star, Inbox as InboxIcon, Mail, ChevronRight, FileText, CheckCheck, Sparkles } from "lucide-react";
import { useStore } from "@/lib/store";
import { cn, money } from "@/lib/utils";
import { Badge, Button } from "../primitives";
import { vendors } from "@/lib/app-data";

export function InboxView({ onOpenInvoice }: { onOpenInvoice: (id: string) => void }) {
  const { emails, readEmail, arrivingEmailId, capture } = useStore();
  const [openId, setOpenId] = useState<string | null>(() => arrivingEmailId ?? emails[0]?.id ?? null);

  // When a new email "arrives", auto-select it so the split-pane shows the content too
  useEffect(() => {
    if (arrivingEmailId) setOpenId(arrivingEmailId);
  }, [arrivingEmailId]);

  // Sort: arriving email goes to the top, rest keep original order
  const sortedEmails = useMemo(() => {
    if (!arrivingEmailId) return emails;
    const arriving = emails.find((e) => e.id === arrivingEmailId);
    if (!arriving) return emails;
    return [arriving, ...emails.filter((e) => e.id !== arrivingEmailId)];
  }, [emails, arrivingEmailId]);

  const open = emails.find((e) => e.id === openId) ?? null;

  return (
    <div className="grid grid-cols-[360px_1fr] h-full min-h-0">
      <div className="flex flex-col border-r border-border bg-background min-h-0">
        <div className="px-4 py-3 border-b border-border flex items-center gap-2">
          <Search className="w-4 h-4 text-muted" />
          <input
            placeholder="Search inbox"
            className="bg-transparent text-sm outline-none flex-1 placeholder:text-muted"
          />
          <span className="text-[11px] text-muted">{emails.length} threads</span>
        </div>
        <div className="flex-1 overflow-auto scrollbar-thin">
          {sortedEmails.map((e) => {
            const selected = e.id === openId;
            const arriving = e.id === arrivingEmailId;
            return (
              <button
                key={e.id}
                onClick={() => {
                  setOpenId(e.id);
                  readEmail(e.id);
                }}
                className={cn(
                  "w-full text-left px-4 py-3 border-b border-border flex flex-col gap-1 transition-colors relative",
                  selected ? "bg-surface" : "hover:bg-surface",
                  e.unread && "bg-[color-mix(in_oklab,var(--brand-soft)_30%,white)]",
                  arriving && "animate-fade-in-up ring-2 ring-inset ring-[color:var(--brand)]/40 bg-brand-soft"
                )}
              >
                <div className="flex items-center gap-2">
                  <span className={cn("text-[13px] truncate", e.unread ? "font-semibold" : "text-foreground")}>
                    {e.fromName}
                  </span>
                  {arriving && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-brand text-white text-[10px] font-medium animate-pulse-soft">
                      New
                    </span>
                  )}
                  <span className="ml-auto text-[11px] text-muted">{arriving ? "just now" : e.receivedAt}</span>
                </div>
                <div className="text-[13px] truncate">
                  <span className={cn(e.unread ? "font-semibold" : "text-foreground")}>{e.subject}</span>
                  <span className="text-muted font-normal"> · {e.snippet}</span>
                </div>
                <div className="flex items-center gap-2">
                  {e.attachment && (
                    <span className="inline-flex items-center gap-1 text-[11px] text-muted">
                      <Paperclip className="w-3 h-3" /> {e.attachment.name}
                    </span>
                  )}
                  {e.captured && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-brand text-white text-[10px] font-medium">
                      <CheckCheck className="w-3 h-3" /> Captured
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {open ? <EmailDetail emailId={open.id} onOpenInvoice={onOpenInvoice} /> : <EmptyRight />}
    </div>
  );
}

function EmptyRight() {
  return (
    <div className="grid place-items-center text-muted">
      <div className="flex items-center gap-2 text-sm">
        <InboxIcon className="w-4 h-4" /> Select a thread
      </div>
    </div>
  );
}

function EmailDetail({ emailId, onOpenInvoice }: { emailId: string; onOpenInvoice: (id: string) => void }) {
  const { emails, invoices, capture } = useStore();
  const email = emails.find((e) => e.id === emailId)!;
  const invoice = email.invoiceId ? invoices.find((i) => i.id === email.invoiceId) : null;
  const vendor = invoice ? vendors[invoice.vendorKey] : null;
  const captured = email.captured || (invoice && invoice.status !== "inbox");

  return (
    <div className="flex flex-col bg-surface min-h-0">
      <div className="px-6 py-4 border-b border-border bg-background">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="text-xl font-semibold tracking-tight truncate">{email.subject}</div>
            <div className="mt-1 flex items-center gap-2 text-sm">
              <span className="w-7 h-7 rounded-full bg-surface border border-border grid place-items-center text-[11px] font-medium">
                {email.fromName.split(" ").map((w) => w[0]).slice(0, 2).join("")}
              </span>
              <span className="font-medium">{email.fromName}</span>
              <span className="text-muted">&lt;{email.fromEmail}&gt;</span>
              <span className="ml-2 text-xs text-muted">{email.receivedAt}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button className="text-muted hover:text-foreground p-2 rounded-md hover:bg-surface">
              <Star className="w-4 h-4" />
            </button>
            {invoice ? (
              <Button
                onClick={() => {
                  if (!captured) capture(email.id);
                  onOpenInvoice(invoice.id);
                }}
              >
                <Sparkles className="w-4 h-4" />
                Watch agent work
              </Button>
            ) : (
              <Button variant="outline" disabled>
                <Mail className="w-4 h-4" />
                No invoice attached
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-2 gap-6 px-6 py-5 overflow-auto scrollbar-thin">
        <div>
          <div className="text-xs uppercase tracking-wider text-muted mb-2">Message</div>
          <div className="space-y-3 text-[14px] leading-relaxed bg-background border border-border rounded-lg p-5">
            {email.bodyParagraphs.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
          {email.attachment && (
            <div className="mt-4">
              <div className="text-xs uppercase tracking-wider text-muted mb-2">Attachment</div>
              <div className="flex items-center gap-3 px-4 py-3 border border-border rounded-lg bg-background">
                <div className="w-9 h-9 rounded bg-surface grid place-items-center">
                  <FileText className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{email.attachment.name}</div>
                  <div className="text-xs text-muted">{email.attachment.pages} page PDF</div>
                </div>
                {invoice && (
                  <Badge tone="brand">{invoice.invoiceNumber}</Badge>
                )}
              </div>
            </div>
          )}
        </div>
        <div>
          <div className="text-xs uppercase tracking-wider text-muted mb-2">Attachment preview</div>
          {invoice && vendor ? (
            <InvoicePreview invoice={invoice} vendorName={vendor.name} />
          ) : (
            <div className="h-[420px] border border-dashed border-border rounded-lg grid place-items-center text-sm text-muted">
              No invoice on this thread
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function InvoicePreview({ invoice, vendorName }: { invoice: { invoiceNumber: string; issueDate: string; dueDate: string; poNumber: string; propertyRef: string; lines: { description: string; qty: number; unitPrice: number }[]; total: number }; vendorName: string }) {
  return (
    <div className="rounded-lg shadow-[0_8px_30px_rgba(27,42,74,0.08)] border border-border bg-white overflow-hidden">
      <div className="h-1.5 bg-brand" />
      <div className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-[10px] tracking-[0.2em] font-semibold text-muted">INVOICE</div>
            <div className="text-lg font-semibold mt-0.5">{vendorName}</div>
          </div>
          <div className="text-right text-xs text-muted">
            <div>Invoice #: {invoice.invoiceNumber}</div>
            <div>Issued: {invoice.issueDate}</div>
            <div>Due: {invoice.dueDate}</div>
          </div>
        </div>
        <div className="mt-4 text-xs text-muted">Bill to</div>
        <div className="text-sm font-medium">Greenfield Property Management</div>
        <div className="text-xs text-muted">{invoice.propertyRef}</div>
        <div className="text-xs text-muted">Ref PO: {invoice.poNumber}</div>
        <table className="w-full mt-4 text-[13px]">
          <thead>
            <tr className="text-[10px] uppercase tracking-wider text-muted border-b border-border">
              <th className="text-left font-medium py-1.5">Description</th>
              <th className="text-right font-medium py-1.5 w-12">Qty</th>
              <th className="text-right font-medium py-1.5 w-16">Unit</th>
              <th className="text-right font-medium py-1.5 w-20">Total</th>
            </tr>
          </thead>
          <tbody>
            {invoice.lines.map((l, i) => (
              <tr key={i} className="border-b border-border">
                <td className="py-1.5 pr-2">{l.description}</td>
                <td className="py-1.5 text-right">{l.qty}</td>
                <td className="py-1.5 text-right">{money(l.unitPrice)}</td>
                <td className="py-1.5 text-right">{money(l.qty * l.unitPrice)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td className="py-2" />
              <td />
              <td className="py-2 text-right text-muted text-xs">Total due</td>
              <td className="py-2 text-right font-semibold">{money(invoice.total)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
