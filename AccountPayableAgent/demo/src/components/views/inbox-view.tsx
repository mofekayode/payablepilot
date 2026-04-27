"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Paperclip, Search, Star, Inbox as InboxIcon, Mail, ChevronRight, FileText, CheckCheck, Sparkles, Upload, RefreshCw, Wifi, AlertTriangle } from "lucide-react";
import { useStore } from "@/lib/store";
import { cn, money } from "@/lib/utils";
import { Badge, Button } from "../primitives";
import { vendors } from "@/lib/app-data";
import { UploadInvoiceModal } from "../upload-invoice-modal";

type LiveAttachment = { filename: string; mimeType: string; attachmentId: string; size: number };
type LiveMessage = {
  id: string;
  threadId: string;
  from: string;
  subject: string;
  receivedAt: string;
  snippet: string;
  hasAttachments: boolean;
  attachmentNames: string[];
  attachments: LiveAttachment[];
};

type ExtractedInvoice = {
  vendor_name: string | null;
  vendor_email: string | null;
  invoice_number: string | null;
  issue_date: string | null;
  due_date: string | null;
  po_number: string | null;
  project_ref: string | null;
  subtotal: number | null;
  tax: number | null;
  total: number | null;
  currency: string | null;
  line_items: Array<{ description: string; quantity: number | null; unit_price: number | null; amount: number | null; project_ref: string | null }>;
  raw_text_snippet: string | null;
};

type LiveState = { kind: "idle" } | { kind: "loading" } | { kind: "error"; message: string } | { kind: "ready"; messages: LiveMessage[] };

export function InboxView({ onOpenInvoice }: { onOpenInvoice: (id: string) => void }) {
  const { emails, readEmail, arrivingEmailId, capture } = useStore();
  const [openId, setOpenId] = useState<string | null>(() => arrivingEmailId ?? emails[0]?.id ?? null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [live, setLive] = useState<LiveState>({ kind: "idle" });
  const [openLiveId, setOpenLiveId] = useState<string | null>(null);

  const fetchLive = useCallback(async () => {
    setLive({ kind: "loading" });
    try {
      const res = await fetch("/api/integrations/gmail/messages?days=30", { cache: "no-store" });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setLive({ kind: "error", message: data.error ?? `HTTP ${res.status}` });
        return;
      }
      const data = (await res.json()) as { messages: LiveMessage[] };
      setLive({ kind: "ready", messages: data.messages ?? [] });
    } catch (e) {
      setLive({ kind: "error", message: (e as Error).message });
    }
  }, []);

  useEffect(() => {
    fetchLive();
  }, [fetchLive]);

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
        <div className="px-4 py-2.5 border-b border-border flex items-center gap-2">
          <Search className="w-4 h-4 text-muted" />
          <input
            placeholder="Search inbox"
            className="bg-transparent text-sm outline-none flex-1 placeholder:text-muted"
          />
          <button
            onClick={() => setUploadOpen(true)}
            className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md bg-foreground text-background text-[12px] font-medium hover:opacity-90"
            title="Upload an invoice that didn't come through email"
          >
            <Upload className="w-3.5 h-3.5" /> Upload
          </button>
        </div>
        <div className="flex-1 overflow-auto scrollbar-thin">
          <LiveMailboxSection
            state={live}
            openId={openLiveId}
            onSelect={(id) => {
              setOpenLiveId(id);
              setOpenId(null);
            }}
            onRefresh={fetchLive}
          />

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

      {openLiveId && live.kind === "ready" ? (
        <LiveMessageDetail
          message={live.messages.find((m) => m.id === openLiveId) ?? null}
          onBack={() => setOpenLiveId(null)}
        />
      ) : open ? (
        <EmailDetail emailId={open.id} onOpenInvoice={onOpenInvoice} />
      ) : (
        <EmptyRight />
      )}
      <UploadInvoiceModal open={uploadOpen} onClose={() => setUploadOpen(false)} />
    </div>
  );
}

function LiveMailboxSection({
  state,
  openId,
  onSelect,
  onRefresh,
}: {
  state: LiveState;
  openId: string | null;
  onSelect: (id: string) => void;
  onRefresh: () => void;
}) {
  const isLoading = state.kind === "loading";
  const messages = state.kind === "ready" ? state.messages : [];
  const errorMsg = state.kind === "error" ? state.message : null;
  const notConnected = errorMsg ? /not connected|configured/i.test(errorMsg) : false;

  return (
    <div className="border-b-2 border-[color:var(--brand)]/20">
      <div className="px-4 py-2 bg-brand-soft/40 flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-wider font-semibold text-brand">
          <Wifi className="w-3 h-3" /> Live mailbox
        </span>
        <span className="text-[11px] text-muted truncate flex-1">
          {state.kind === "ready" && messages.length > 0
            ? `${messages.length} recent · attachments only`
            : state.kind === "ready"
              ? "no recent attachments"
              : isLoading
                ? "syncing…"
                : notConnected
                  ? "Gmail not connected"
                  : "couldn't load"}
        </span>
        <button
          onClick={onRefresh}
          className="text-muted hover:text-foreground p-1 rounded"
          title="Refresh"
        >
          <RefreshCw className={cn("w-3 h-3", isLoading && "animate-spin")} />
        </button>
      </div>

      {notConnected && (
        <div className="px-4 py-3 text-[12.5px] text-muted bg-background border-b border-border">
          <a href="/settings" className="text-brand underline font-medium">
            Connect Gmail
          </a>{" "}
          to start syncing real invoices into this inbox.
        </div>
      )}

      {!notConnected && state.kind === "error" && (
        <div className="px-4 py-3 text-[12.5px] text-rose-700 bg-rose-50 border-b border-rose-200 flex items-start gap-2">
          <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" /> {errorMsg}
        </div>
      )}

      {state.kind === "ready" && messages.length === 0 && (
        <div className="px-4 py-4 text-[12.5px] text-muted bg-background border-b border-border">
          Nothing with attachments in the last 30 days. Forward an invoice to your inbox and refresh.
        </div>
      )}

      {messages.map((m) => {
        const fromName = m.from.replace(/<.*>$/, "").replace(/^"|"$/g, "").trim() || m.from;
        const selected = m.id === openId;
        return (
          <button
            key={m.id}
            onClick={() => onSelect(m.id)}
            className={cn(
              "w-full text-left px-4 py-3 border-b border-border bg-background flex flex-col gap-1 transition-colors relative",
              selected ? "bg-brand-soft" : "hover:bg-surface"
            )}
          >
            <span className="absolute left-0 top-2.5 bottom-2.5 w-[3px] rounded-r bg-brand" />
            <div className="flex items-center gap-2">
              <span className="text-[13px] font-medium truncate">{fromName}</span>
              <span className="ml-auto text-[11px] text-muted shrink-0">
                {new Date(m.receivedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
              </span>
            </div>
            <div className="text-[13px] truncate">
              <span className="font-medium">{m.subject || "(no subject)"}</span>
              <span className="text-muted font-normal"> · {m.snippet}</span>
            </div>
            {m.attachmentNames.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap">
                {m.attachmentNames.slice(0, 2).map((n) => (
                  <span
                    key={n}
                    className="inline-flex items-center gap-1 text-[10.5px] text-muted bg-surface px-1.5 py-0.5 rounded border border-border"
                  >
                    <Paperclip className="w-2.5 h-2.5" /> {n}
                  </span>
                ))}
                {m.attachmentNames.length > 2 && (
                  <span className="text-[10.5px] text-muted">+{m.attachmentNames.length - 2}</span>
                )}
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}

function LiveMessageDetail({
  message,
  onBack,
}: {
  message: LiveMessage | null;
  onBack: () => void;
}) {
  const [extracting, setExtracting] = useState<string | null>(null); // attachmentId currently extracting
  const [extractions, setExtractions] = useState<Record<string, ExtractedInvoice>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  if (!message) {
    return (
      <div className="grid place-items-center text-muted">
        <span className="text-sm">Message not found.</span>
      </div>
    );
  }

  const fromName = message.from.replace(/<.*>$/, "").replace(/^"|"$/g, "").trim() || message.from;
  const pdfs = message.attachments.filter((a) => /pdf/i.test(a.mimeType) || /\.pdf$/i.test(a.filename));

  const extractAttachment = async (attachmentId: string) => {
    setExtracting(attachmentId);
    setErrors((prev) => ({ ...prev, [attachmentId]: "" }));
    try {
      const res = await fetch("/api/extract/invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: "gmail", messageId: message.id, attachmentId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      setExtractions((prev) => ({ ...prev, [attachmentId]: data.extracted }));
    } catch (e) {
      setErrors((prev) => ({ ...prev, [attachmentId]: (e as Error).message }));
    } finally {
      setExtracting(null);
    }
  };

  return (
    <div className="flex flex-col bg-surface min-h-0">
      <div className="px-6 py-4 border-b border-border bg-background flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-wider font-semibold text-brand mb-1">
            <Wifi className="w-3 h-3" /> Live · from your Gmail
          </div>
          <div className="text-xl font-semibold tracking-tight truncate">{message.subject || "(no subject)"}</div>
          <div className="mt-1 text-sm">
            <span className="font-medium">{fromName}</span>
            <span className="text-muted ml-2">{new Date(message.receivedAt).toLocaleString()}</span>
          </div>
        </div>
        <button onClick={onBack} className="text-muted hover:text-foreground text-sm shrink-0">
          Back
        </button>
      </div>

      <div className="p-6 space-y-4 overflow-auto scrollbar-thin">
        <div className="rounded-lg border border-border bg-background p-4 text-[13.5px] leading-relaxed text-foreground">
          {message.snippet || "No preview text."}
        </div>

        {message.attachments.length > 0 && (
          <div className="rounded-lg border border-border bg-background">
            <div className="px-4 py-2 border-b border-border text-[11px] uppercase tracking-wider text-muted font-medium">
              Attachments ({message.attachments.length})
            </div>
            <ul>
              {message.attachments.map((a) => {
                const isPdf = /pdf/i.test(a.mimeType) || /\.pdf$/i.test(a.filename);
                const extracted = extractions[a.attachmentId];
                const err = errors[a.attachmentId];
                return (
                  <li key={a.attachmentId} className="border-b border-border last:border-0">
                    <div className="flex items-center gap-3 px-4 py-3">
                      <div className="w-9 h-9 rounded bg-surface grid place-items-center shrink-0">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-[13px] truncate">{a.filename}</div>
                        <div className="text-[11px] text-muted">
                          {a.mimeType} · {(a.size / 1024).toFixed(1)} KB
                        </div>
                      </div>
                      {isPdf ? (
                        <button
                          onClick={() => extractAttachment(a.attachmentId)}
                          disabled={extracting !== null}
                          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md bg-foreground text-background text-[12.5px] font-medium hover:opacity-90 disabled:opacity-50"
                        >
                          {extracting === a.attachmentId ? (
                            <>
                              <span className="w-3 h-3 rounded-full border-2 border-background border-t-transparent animate-spin" />
                              Extracting…
                            </>
                          ) : extracted ? (
                            <>
                              <Sparkles className="w-3.5 h-3.5" /> Re-extract
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-3.5 h-3.5" /> Extract
                            </>
                          )}
                        </button>
                      ) : (
                        <Badge tone="neutral">{a.mimeType.split("/").pop()}</Badge>
                      )}
                    </div>
                    {err && (
                      <div className="px-4 pb-3 text-[12px] text-rose-700 flex items-start gap-1.5">
                        <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" /> {err}
                      </div>
                    )}
                    {extracted && <ExtractedFields data={extracted} />}
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {pdfs.length === 0 && message.attachments.length > 0 && (
          <div className="rounded-lg border border-dashed border-border p-4 text-[12.5px] text-muted leading-relaxed">
            No PDF attachments to extract from this message.
          </div>
        )}
      </div>
    </div>
  );
}

function ExtractedFields({ data }: { data: ExtractedInvoice }) {
  const fmt = (n: number | null) =>
    n == null ? "—" : new Intl.NumberFormat("en-US", { style: "currency", currency: data.currency || "USD" }).format(n);
  return (
    <div className="px-4 pb-4 pt-1 bg-surface/60">
      <div className="rounded-lg border border-brand/30 bg-background overflow-hidden">
        <div className="px-4 py-2 bg-brand-soft border-b border-brand/20 flex items-center gap-1.5 text-[11px] uppercase tracking-wider font-semibold text-brand">
          <Sparkles className="w-3 h-3" /> Extracted by Claude
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 p-4 text-[13px]">
          <FieldRow label="Vendor" value={data.vendor_name} />
          <FieldRow label="Vendor email" value={data.vendor_email} />
          <FieldRow label="Invoice #" value={data.invoice_number} />
          <FieldRow label="PO #" value={data.po_number} />
          <FieldRow label="Issued" value={data.issue_date} />
          <FieldRow label="Due" value={data.due_date} />
          <FieldRow label="Project / Job" value={data.project_ref} highlight />
          <FieldRow label="Currency" value={data.currency} />
          <FieldRow label="Subtotal" value={fmt(data.subtotal)} />
          <FieldRow label="Tax" value={fmt(data.tax)} />
          <FieldRow label="Total" value={<span className="font-semibold">{fmt(data.total)}</span>} />
        </div>
        {data.line_items?.length > 0 && (
          <div className="border-t border-border">
            <div className="px-4 py-2 text-[11px] uppercase tracking-wider text-muted font-medium">
              Line items ({data.line_items.length})
            </div>
            <ul>
              {data.line_items.slice(0, 8).map((li, i) => (
                <li key={i} className="flex items-start gap-3 px-4 py-2 border-t border-border text-[12.5px]">
                  <div className="flex-1 min-w-0">
                    <div className="truncate">{li.description}</div>
                    {li.project_ref && (
                      <div className="text-[11px] text-brand font-medium">Project: {li.project_ref}</div>
                    )}
                  </div>
                  <div className="text-muted text-right shrink-0 tabular-nums">
                    {li.quantity != null && `${li.quantity} ×`} {li.unit_price != null && fmt(li.unit_price)}
                  </div>
                  <div className="text-right shrink-0 tabular-nums w-20">{fmt(li.amount)}</div>
                </li>
              ))}
              {data.line_items.length > 8 && (
                <li className="px-4 py-2 text-[11.5px] text-muted">
                  +{data.line_items.length - 8} more line items
                </li>
              )}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

function FieldRow({
  label,
  value,
  highlight,
}: {
  label: string;
  value: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="text-[11px] uppercase tracking-wider text-muted font-medium shrink-0 w-[88px]">{label}</span>
      <span className={cn("truncate", highlight && value && "text-brand font-semibold")}>
        {value || <span className="text-muted">—</span>}
      </span>
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
