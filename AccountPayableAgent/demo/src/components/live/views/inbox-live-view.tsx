"use client";
import { useCallback, useEffect, useState } from "react";
import {
  RefreshCw,
  Paperclip,
  Sparkles,
  Inbox as InboxIcon,
  Mail,
  AlertCircle,
  Upload,
  Check,
  Bot,
  UserCheck,
  Loader2,
  FileText,
} from "lucide-react";
import Link from "next/link";
import type { LiveView } from "../sidebar-live";
import { cn } from "@/lib/utils";
import { UploadInvoiceModalLive } from "../upload-invoice-modal-live";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type ExtractedLineItem = {
  description: string;
  quantity: number | null;
  unit_price: number | null;
  amount: number | null;
  project_ref: string | null;
};

type ExtractedFields = {
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
  line_items: ExtractedLineItem[];
} | null;

type ExtractionStatus = "pending" | "extracting" | "done" | "failed" | "skipped";

type InboxMessage = {
  id: string;
  fromEmail: string | null;
  fromName: string | null;
  subject: string | null;
  receivedAt: string | null;
  routingStatus: string;
  routingConfidence: number | null;
  source: "gmail" | "postmark" | string;
  snippet: string | null;
  attachments: { filename: string; mimeType: string; size: number }[];
  extractedFields: ExtractedFields;
  extractionStatus: ExtractionStatus;
  extractionError: string | null;
};

type State =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready"; messages: InboxMessage[] };

export function InboxLiveView({
  onNavigate,
  activeBusinessId,
}: {
  onNavigate: (v: LiveView) => void;
  activeBusinessId: string | null;
}) {
  void onNavigate;
  const [state, setState] = useState<State>({ kind: "idle" });
  const [openId, setOpenId] = useState<string | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);

  const fetchInbox = useCallback(async (opts: { silent?: boolean } = {}) => {
    if (!opts.silent) setState({ kind: "loading" });
    try {
      const res = await fetch("/api/inbox?limit=50", { cache: "no-store" });
      if (!res.ok) {
        if (opts.silent) return;
        const text = await res.text();
        setState({ kind: "error", message: text || `HTTP ${res.status}` });
        return;
      }
      const data = (await res.json()) as { messages: InboxMessage[] };
      const incoming = data.messages ?? [];
      setState({ kind: "ready", messages: incoming });
      setOpenId((current) => current ?? incoming[0]?.id ?? null);
    } catch (e) {
      if (opts.silent) return;
      setState({ kind: "error", message: (e as Error).message });
    }
  }, []);

  useEffect(() => {
    fetchInbox();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeBusinessId]);

  // Realtime subscription: any INSERT or UPDATE on inbox_messages for the
  // active business triggers a quick re-fetch. Push fills the DB; this
  // makes the UI reflect that without a manual refresh.
  useEffect(() => {
    if (!activeBusinessId) return;
    const supabase = createSupabaseBrowserClient();
    const channel = supabase
      .channel(`inbox-${activeBusinessId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "inbox_messages",
          filter: `business_id=eq.${activeBusinessId}`,
        },
        () => {
          fetchInbox({ silent: true });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeBusinessId, fetchInbox]);

  const messages = state.kind === "ready" ? state.messages : [];
  const open = messages.find((m) => m.id === openId) ?? null;

  return (
    <div className="grid grid-cols-[420px_1fr] h-full min-h-0">
      <div className="flex flex-col border-r border-border bg-background min-h-0">
        <div className="px-4 py-3 border-b border-border flex items-center gap-2">
          <Mail className="w-4 h-4 text-muted" />
          <span className="text-[13px] font-medium flex-1">Inbox</span>
          <button
            onClick={() => setUploadOpen(true)}
            className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md bg-surface border border-border text-[12px] hover:bg-background"
            title="Upload an invoice manually"
          >
            <Upload className="w-3.5 h-3.5" /> Upload
          </button>
          <button
            onClick={() => fetchInbox()}
            disabled={state.kind === "loading"}
            className="text-muted hover:text-foreground p-1.5 rounded"
            title="Refresh"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", state.kind === "loading" && "animate-spin")} />
          </button>
        </div>

        <div className="flex-1 overflow-auto scrollbar-thin">
          {state.kind === "loading" && messages.length === 0 && (
            <div className="px-4 py-6 text-[13px] text-muted">Loading invoices…</div>
          )}

          {state.kind === "error" && (
            <div className="p-4 text-[12.5px] text-rose-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" /> {state.message}
            </div>
          )}

          {state.kind === "ready" && messages.length === 0 && (
            <div className="p-6 text-center text-[13px] text-muted leading-relaxed">
              <InboxIcon className="w-6 h-6 text-muted/60 mx-auto mb-2" />
              No invoices routed to this business yet.
              <div className="mt-2">
                Need to wire your AP mailbox?{" "}
                <Link href="/settings" className="text-brand underline">
                  Connect Gmail
                </Link>
                .
              </div>
            </div>
          )}

          {messages.map((m) => {
            const selected = m.id === openId;
            const senderLabel = m.fromName || m.fromEmail || "(unknown sender)";
            const hasAttach = m.attachments.length > 0;
            const ex = m.extractedFields;
            return (
              <button
                key={m.id}
                onClick={() => setOpenId(m.id)}
                className={cn(
                  "w-full text-left px-4 py-3 border-b border-border transition-colors",
                  selected ? "bg-surface" : "hover:bg-surface"
                )}
              >
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-medium truncate flex-1">{senderLabel}</span>
                  <span className="text-[11px] text-muted shrink-0">{formatRelative(m.receivedAt)}</span>
                </div>
                <div className="mt-0.5 text-[12.5px] text-foreground truncate">{m.subject || "(no subject)"}</div>
                {ex?.vendor_name || ex?.total != null ? (
                  <div className="mt-0.5 text-[12px] text-foreground font-medium truncate">
                    {ex.vendor_name && <span>{ex.vendor_name}</span>}
                    {ex.vendor_name && ex.total != null && <span className="text-muted"> · </span>}
                    {ex.total != null && (
                      <span className="tabular-nums">{formatMoney(ex.total, ex.currency)}</span>
                    )}
                  </div>
                ) : (
                  m.snippet && <div className="mt-0.5 text-[11.5px] text-muted line-clamp-1">{m.snippet}</div>
                )}
                <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                  <RoutingBadge status={m.routingStatus} confidence={m.routingConfidence} />
                  <ExtractionBadge status={m.extractionStatus} />
                  {hasAttach && (
                    <span className="inline-flex items-center gap-1 text-[10.5px] font-medium px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-700">
                      <Paperclip className="w-2.5 h-2.5" />
                      {m.attachments.length}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-auto bg-surface">
        {open ? (
          <DetailPane message={open} />
        ) : (
          <div className="h-full grid place-items-center text-[13px] text-muted">
            Select an invoice on the left to see details.
          </div>
        )}
      </div>

      <UploadInvoiceModalLive
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onUploaded={() => {
          setUploadOpen(false);
          fetchInbox();
        }}
      />
    </div>
  );
}

function DetailPane({ message }: { message: InboxMessage }) {
  return (
    <div className="max-w-[820px] mx-auto p-8">
      <div className="text-[11px] uppercase tracking-wider text-muted">Invoice email</div>
      <h1 className="mt-1 text-[24px] font-semibold tracking-tight">{message.subject || "(no subject)"}</h1>
      <div className="mt-2 flex items-center gap-3 text-[13px] text-muted flex-wrap">
        <span>
          From{" "}
          <span className="font-medium text-foreground">
            {message.fromName ?? message.fromEmail ?? "—"}
          </span>
        </span>
        {message.fromEmail && message.fromName && (
          <span className="text-muted">&lt;{message.fromEmail}&gt;</span>
        )}
        <span>·</span>
        <span>{formatAbsolute(message.receivedAt)}</span>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <RoutingBadge status={message.routingStatus} confidence={message.routingConfidence} />
        <ExtractionBadge status={message.extractionStatus} />
      </div>

      {message.extractionStatus === "failed" && message.extractionError && (
        <div className="mt-4 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-[12.5px] text-rose-800">
          Extraction failed: {message.extractionError}
        </div>
      )}

      {message.extractedFields && <ExtractedFieldsPanel fields={message.extractedFields} />}

      {!message.extractedFields && message.extractionStatus === "extracting" && (
        <div className="mt-6 rounded-lg border border-border bg-background p-4 text-[13px] text-muted flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          Reading the invoice with Claude — usually takes a few seconds.
        </div>
      )}

      {message.snippet && (
        <div className="mt-6 rounded-lg border border-border bg-background p-4 text-[13.5px] leading-relaxed text-foreground">
          <div className="text-[11px] uppercase tracking-wider text-muted font-medium mb-1.5">Email body</div>
          {message.snippet}
        </div>
      )}

      {message.attachments.length > 0 && (
        <div className="mt-6">
          <div className="text-[11px] uppercase tracking-wider text-muted font-medium mb-2">
            Attachments
          </div>
          <div className="space-y-2">
            {message.attachments.map((a, i) => (
              <div
                key={i}
                className="rounded-md border border-border bg-background px-3 py-2 flex items-center gap-3 text-[13px]"
              >
                <Paperclip className="w-4 h-4 text-muted shrink-0" />
                <span className="font-medium truncate flex-1">{a.filename}</span>
                <span className="text-[11.5px] text-muted">{formatBytes(a.size)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ExtractedFieldsPanel({ fields }: { fields: NonNullable<ExtractedFields> }) {
  return (
    <div className="mt-6 rounded-lg border border-border bg-background overflow-hidden">
      <div className="px-4 py-2.5 border-b border-border bg-surface flex items-center gap-2">
        <FileText className="w-4 h-4 text-muted" />
        <span className="text-[12.5px] font-semibold">Extracted fields</span>
      </div>
      <div className="px-4 py-3 grid grid-cols-2 gap-x-6 gap-y-2 text-[13px]">
        <Field label="Vendor" value={fields.vendor_name} />
        <Field label="Vendor email" value={fields.vendor_email} />
        <Field label="Invoice #" value={fields.invoice_number} mono />
        <Field label="PO #" value={fields.po_number} mono />
        <Field label="Issue date" value={fields.issue_date} />
        <Field label="Due date" value={fields.due_date} />
        <Field label="Project ref" value={fields.project_ref} />
        <Field label="Total" value={fields.total != null ? formatMoney(fields.total, fields.currency) : null} mono />
      </div>
      {fields.line_items && fields.line_items.length > 0 && (
        <div className="border-t border-border">
          <div className="px-4 py-2 text-[10.5px] uppercase tracking-wider text-muted font-medium">
            Line items ({fields.line_items.length})
          </div>
          <table className="w-full text-[12.5px]">
            <thead>
              <tr className="text-left text-muted border-b border-border">
                <th className="px-4 py-1.5 font-medium">Description</th>
                <th className="px-4 py-1.5 font-medium text-right">Qty</th>
                <th className="px-4 py-1.5 font-medium text-right">Unit price</th>
                <th className="px-4 py-1.5 font-medium text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {fields.line_items.map((li, i) => (
                <tr key={i} className="border-b border-border/40 last:border-0">
                  <td className="px-4 py-2 align-top">{li.description}</td>
                  <td className="px-4 py-2 text-right tabular-nums text-muted">
                    {li.quantity ?? "—"}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums text-muted">
                    {li.unit_price != null ? formatMoney(li.unit_price, fields.currency) : "—"}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums font-medium">
                    {li.amount != null ? formatMoney(li.amount, fields.currency) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Field({ label, value, mono }: { label: string; value: string | null; mono?: boolean }) {
  return (
    <div>
      <div className="text-[10.5px] uppercase tracking-wider text-muted">{label}</div>
      <div className={cn("mt-0.5 text-foreground truncate", mono && "font-mono")}>{value || "—"}</div>
    </div>
  );
}

function RoutingBadge({ status, confidence }: { status: string; confidence: number | null }) {
  const c = confidence ? Math.round(confidence * 100) : null;
  switch (status) {
    case "auto_sender_history":
      return (
        <span className="inline-flex items-center gap-1 text-[10.5px] font-medium px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
          <Check className="w-2.5 h-2.5" /> Auto-routed
          {c !== null && <span className="ml-0.5 text-emerald-600/80">{c}%</span>}
        </span>
      );
    case "auto_content_match":
      return (
        <span className="inline-flex items-center gap-1 text-[10.5px] font-medium px-1.5 py-0.5 rounded bg-brand-soft text-brand">
          <Bot className="w-2.5 h-2.5" /> AI-matched
          {c !== null && <span className="ml-0.5 opacity-80">{c}%</span>}
        </span>
      );
    case "manual_assigned":
      return (
        <span className="inline-flex items-center gap-1 text-[10.5px] font-medium px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
          <UserCheck className="w-2.5 h-2.5" /> Manually assigned
        </span>
      );
    case "auto_alias":
      return (
        <span className="inline-flex items-center gap-1 text-[10.5px] font-medium px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
          <Sparkles className="w-2.5 h-2.5" /> Forwarded
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 text-[10.5px] font-medium px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-700">
          {status}
        </span>
      );
  }
}

function ExtractionBadge({ status }: { status: ExtractionStatus }) {
  switch (status) {
    case "done":
      return (
        <span className="inline-flex items-center gap-1 text-[10.5px] font-medium px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
          <Sparkles className="w-2.5 h-2.5" /> Extracted
        </span>
      );
    case "extracting":
      return (
        <span className="inline-flex items-center gap-1 text-[10.5px] font-medium px-1.5 py-0.5 rounded bg-brand-soft text-brand">
          <Loader2 className="w-2.5 h-2.5 animate-spin" /> Extracting
        </span>
      );
    case "failed":
      return (
        <span className="inline-flex items-center gap-1 text-[10.5px] font-medium px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200">
          <AlertCircle className="w-2.5 h-2.5" /> Extraction failed
        </span>
      );
    case "skipped":
      return (
        <span className="inline-flex items-center gap-1 text-[10.5px] font-medium px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-600">
          No PDF
        </span>
      );
    default:
      return null;
  }
}

function formatRelative(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const diffMs = Date.now() - d.getTime();
  if (diffMs < 60_000) return "just now";
  if (diffMs < 3_600_000) return `${Math.floor(diffMs / 60_000)}m`;
  if (diffMs < 86_400_000) return `${Math.floor(diffMs / 3_600_000)}h`;
  return d.toLocaleDateString();
}

function formatAbsolute(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString();
}

function formatMoney(amount: number, currency: string | null): string {
  const code = currency && currency.length === 3 ? currency : "USD";
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: code }).format(amount);
  } catch {
    return `${amount} ${code}`;
  }
}

function formatBytes(n: number): string {
  if (!n) return "";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}
