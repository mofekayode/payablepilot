"use client";
import { useCallback, useEffect, useState } from "react";
import {
  RefreshCw,
  Paperclip,
  Sparkles,
  Inbox as InboxIcon,
  Mail,
  AlertCircle,
  FileText,
  Upload,
  ArrowRight,
  Check,
} from "lucide-react";
import Link from "next/link";
import type { LiveView } from "../sidebar-live";
import { cn } from "@/lib/utils";
import { addCaptured, newCaptured } from "@/lib/captured-store";
import { UploadInvoiceModalLive } from "../upload-invoice-modal-live";
import { useExtractStream, type ExtractedInvoice } from "@/lib/use-extract-stream";

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

type State =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready"; messages: LiveMessage[] };

export function InboxLiveView({ onNavigate }: { onNavigate: (v: LiveView) => void }) {
  const [state, setState] = useState<State>({ kind: "idle" });
  const [openId, setOpenId] = useState<string | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);

  const fetchMessages = useCallback(async (opts: { silent?: boolean } = {}) => {
    // Background polls run silently — we only flip into "loading" on the first
    // call so the screen doesn't flash empty every 3 seconds. Errors during a
    // silent poll are also swallowed (a transient blip shouldn't tear down the
    // whole inbox UI).
    if (!opts.silent) setState({ kind: "loading" });
    try {
      const res = await fetch("/api/integrations/gmail/messages?days=30&max=25", { cache: "no-store" });
      if (!res.ok) {
        if (opts.silent) return;
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setState({ kind: "error", message: data.error ?? `HTTP ${res.status}` });
        return;
      }
      const data = (await res.json()) as { messages: LiveMessage[] };
      const incoming = data.messages ?? [];
      // Only mutate state if the list actually changed (different IDs in
      // different positions). Same IDs in same order → keep the previous array
      // reference so child rows don't re-render.
      setState((prev) => {
        if (prev.kind === "ready" && sameMessageList(prev.messages, incoming)) {
          return prev;
        }
        return { kind: "ready", messages: incoming };
      });
      if (incoming.length && !openId) setOpenId(incoming[0].id);
    } catch (e) {
      if (opts.silent) return;
      setState({ kind: "error", message: (e as Error).message });
    }
  }, [openId]);

  useEffect(() => {
    // First call surfaces loading skeleton; subsequent polls run silently in
    // the background so the UI doesn't flash on every tick.
    fetchMessages();
    const interval = setInterval(() => fetchMessages({ silent: true }), 3_000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const messages = state.kind === "ready" ? state.messages : [];
  const open = messages.find((m) => m.id === openId) ?? null;
  const notConnected =
    state.kind === "error" ? /not connected|configured/i.test(state.message) : false;

  return (
    <div className="grid grid-cols-[380px_1fr] h-full min-h-0">
      <div className="flex flex-col border-r border-border bg-background min-h-0">
        <div className="px-4 py-3 border-b border-border flex items-center gap-2">
          <Mail className="w-4 h-4 text-muted" />
          <span className="text-[13px] font-medium flex-1">Live mailbox</span>
          <button
            onClick={() => setUploadOpen(true)}
            className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md bg-surface border border-border text-[12px] hover:bg-background"
            title="Upload an invoice manually"
          >
            <Upload className="w-3.5 h-3.5" /> Upload
          </button>
          <button
            onClick={() => fetchMessages()}
            disabled={state.kind === "loading"}
            className="text-muted hover:text-foreground p-1.5 rounded"
            title="Refresh"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", state.kind === "loading" && "animate-spin")} />
          </button>
        </div>

        <div className="flex-1 overflow-auto scrollbar-thin">
          {state.kind === "loading" && messages.length === 0 && (
            <div className="px-4 py-6 text-[13px] text-muted">Loading recent invoices…</div>
          )}

          {notConnected && (
            <div className="p-4 text-[13px] text-muted leading-relaxed">
              <div className="font-medium text-foreground mb-1">Gmail isn't connected.</div>
              <Link href="/settings" className="text-brand underline">
                Connect Gmail
              </Link>{" "}
              to start syncing real invoices into this inbox.
            </div>
          )}

          {state.kind === "error" && !notConnected && (
            <div className="p-4 text-[12.5px] text-rose-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" /> {state.message}
            </div>
          )}

          {state.kind === "ready" && messages.length === 0 && (
            <div className="p-6 text-center text-[13px] text-muted">
              No attachment-bearing emails in the last 30 days. Forward an invoice into your inbox and refresh.
            </div>
          )}

          {messages.map((m) => {
            const fromName = m.from.replace(/<.*>$/, "").replace(/^"|"$/g, "").trim() || m.from;
            const selected = m.id === openId;
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
                  <span className="text-[13px] font-medium truncate flex-1">{fromName}</span>
                  <span className="text-[11px] text-muted shrink-0">
                    {new Date(m.receivedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                  </span>
                </div>
                <div className="text-[13px] mt-0.5 truncate">
                  <span className="font-medium">{m.subject || "(no subject)"}</span>
                  <span className="text-muted font-normal"> · {m.snippet}</span>
                </div>
                {m.attachmentNames.length > 0 && (
                  <div className="mt-1 flex items-center gap-1 text-[11px] text-muted">
                    <Paperclip className="w-3 h-3" /> {m.attachmentNames[0]}
                    {m.attachmentNames.length > 1 && ` +${m.attachmentNames.length - 1}`}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {open ? (
        <MessageDetail
          message={open}
          onSavedExtraction={(captured) => {
            // After saving, jump the user to the bills queue so they can finish review.
            // Tiny delay so the success animation is visible.
            setTimeout(() => onNavigate("bills"), 300);
            return captured;
          }}
        />
      ) : (
        <div className="grid place-items-center text-muted text-[13.5px]">
          <div className="flex items-center gap-2">
            <InboxIcon className="w-4 h-4" /> Pick an email
          </div>
        </div>
      )}

      <UploadInvoiceModalLive
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onUploaded={() => onNavigate("bills")}
      />
    </div>
  );
}

function MessageDetail({
  message,
  onSavedExtraction,
}: {
  message: LiveMessage;
  onSavedExtraction: (captured: ReturnType<typeof newCaptured>) => void;
}) {
  const [activeAttachmentId, setActiveAttachmentId] = useState<string | null>(null);
  const [extractions, setExtractions] = useState<Record<string, ExtractedInvoice>>({});
  const [savedAttachmentIds, setSavedAttachmentIds] = useState<Set<string>>(new Set());
  const stream = useExtractStream();

  const fromName = message.from.replace(/<.*>$/, "").replace(/^"|"$/g, "").trim() || message.from;
  const fromEmail = message.from.match(/<([^>]+)>/)?.[1] ?? message.from;

  const extract = async (attachmentId: string) => {
    if (stream.streaming) return;
    setActiveAttachmentId(attachmentId);
    stream.reset();
    await stream.run({ source: "gmail", messageId: message.id, attachmentId });
  };

  // Cache the final extraction once it completes so we can render the same
  // card for subsequent visits without re-running.
  useEffect(() => {
    if (!activeAttachmentId) return;
    if (stream.extracted) {
      setExtractions((p) => ({ ...p, [activeAttachmentId]: stream.extracted! }));
    }
  }, [stream.extracted, activeAttachmentId]);

  const saveToBills = (attachmentId: string) => {
    const ex = extractions[attachmentId];
    if (!ex) return;
    const meta = newCaptured();
    addCaptured({
      id: meta.id,
      createdAt: meta.createdAt,
      status: "extracted",
      source: {
        kind: "gmail",
        messageId: message.id,
        attachmentId,
        fromEmail,
        fromName,
        subject: message.subject,
      },
      vendorName: ex.vendor_name,
      vendorEmail: ex.vendor_email,
      invoiceNumber: ex.invoice_number,
      issueDate: ex.issue_date,
      dueDate: ex.due_date,
      poNumber: ex.po_number,
      projectRefRaw: ex.project_ref,
      subtotal: ex.subtotal,
      tax: ex.tax,
      total: ex.total,
      currency: ex.currency,
      lines: (ex.line_items ?? []).map((li) => ({
        description: li.description,
        quantity: li.quantity,
        unitPrice: li.unit_price,
        amount: li.amount,
        projectRef: li.project_ref,
      })),
      qboVendorId: null,
      qboVendorName: null,
      qboVendorSource: null,
      qboProjectId: null,
      qboProjectName: null,
      qboProjectSource: null,
      qboAccountId: null,
      qboAccountName: null,
      qboAccountSource: null,
      qboBillId: null,
      postedAt: null,
      errorMessage: null,
    });
    setSavedAttachmentIds((s) => new Set(s).add(attachmentId));
    onSavedExtraction(meta);
  };

  return (
    <div className="flex flex-col bg-surface min-h-0 overflow-hidden">
      <div className="px-6 py-4 border-b border-border bg-background">
        <div className="text-xl font-semibold tracking-tight truncate">{message.subject || "(no subject)"}</div>
        <div className="mt-1 text-[13px]">
          <span className="font-medium">{fromName}</span>
          <span className="text-muted ml-2">{fromEmail}</span>
          <span className="text-muted ml-3">{new Date(message.receivedAt).toLocaleString()}</span>
        </div>
      </div>

      <div className="flex-1 overflow-auto scrollbar-thin p-6 space-y-4">
        <div className="rounded-lg border border-border bg-background p-4 text-[13.5px] leading-relaxed">
          {message.snippet || "No preview text."}
        </div>

        {message.attachments.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-4 text-[12.5px] text-muted">
            No attachments on this message.
          </div>
        ) : (
          <div className="rounded-lg border border-border bg-background">
            <div className="px-4 py-2 border-b border-border text-[11px] uppercase tracking-wider text-muted font-medium">
              Attachments ({message.attachments.length})
            </div>
            <ul>
              {message.attachments.map((a) => {
                const isPdf = /pdf/i.test(a.mimeType) || /\.pdf$/i.test(a.filename);
                const cached = extractions[a.attachmentId];
                const isStreamingHere = stream.streaming && activeAttachmentId === a.attachmentId;
                const partialHere = activeAttachmentId === a.attachmentId ? stream.partial : null;
                const errorHere = activeAttachmentId === a.attachmentId ? stream.error : null;
                const saved = savedAttachmentIds.has(a.attachmentId);
                const display = cached ?? (partialHere as ExtractedInvoice | null);
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
                      {isPdf && !cached && (
                        <button
                          onClick={() => extract(a.attachmentId)}
                          disabled={stream.streaming}
                          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md bg-foreground text-background text-[12.5px] font-medium hover:opacity-90 disabled:opacity-50"
                        >
                          {isStreamingHere ? (
                            <>
                              <span className="w-3 h-3 rounded-full border-2 border-background border-t-transparent animate-spin" />
                              Reading…
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-3.5 h-3.5" /> Extract
                            </>
                          )}
                        </button>
                      )}
                      {cached && !saved && (
                        <button
                          onClick={() => saveToBills(a.attachmentId)}
                          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md bg-emerald-600 text-white text-[12.5px] font-medium hover:bg-emerald-700"
                        >
                          Send to bills <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {saved && (
                        <span className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 text-[12.5px] font-medium">
                          <Check className="w-3.5 h-3.5" /> Sent to bills
                        </span>
                      )}
                    </div>
                    {errorHere && (
                      <div className="px-4 pb-3 text-[12px] text-rose-700 flex items-start gap-1.5">
                        <AlertCircle className="w-3 h-3 mt-0.5 shrink-0" /> {errorHere}
                      </div>
                    )}
                    {display && (
                      <ExtractedFields
                        data={display}
                        streaming={isStreamingHere}
                        elapsedMs={isStreamingHere ? stream.elapsedMs : null}
                      />
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

function ExtractedFields({
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
    <div className="px-4 pb-4 pt-1 bg-surface/50">
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
    </div>
  );
}

// Cheap structural check used by the inbox poller — same IDs in the same
// order means nothing visible changed and we can keep the previous state
// reference, avoiding a re-render. Comparing by id is enough because Gmail
// returns a stable id per message.
function sameMessageList(a: LiveMessage[], b: LiveMessage[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i].id !== b[i].id) return false;
  }
  return true;
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
