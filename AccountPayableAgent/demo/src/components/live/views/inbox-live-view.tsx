"use client";
import { useCallback, useEffect, useRef, useState } from "react";
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
import { addCaptured, loadCaptured, newCaptured } from "@/lib/captured-store";
import { UploadInvoiceModalLive } from "../upload-invoice-modal-live";
import { useExtractStream, type ExtractedInvoice } from "@/lib/use-extract-stream";
import { ExtractedFieldsCard } from "../extracted-fields-card";
import { loadAutomation } from "@/lib/automation-settings";
import {
  getStream,
  startStream,
  updateStream,
  useStreamEntry,
} from "@/lib/extract-registry";
import { parse as parsePartial, Allow } from "partial-json";

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

  // Auto-extraction state. We only auto-extract messages that *arrive after*
  // the first inbox load, so opening the app doesn't fire a flood of Claude
  // calls against the user's existing backlog.
  const initialIdsRef = useRef<Set<string> | null>(null);
  const inFlightRef = useRef<Set<string>>(new Set());
  const [autoStatus, setAutoStatus] = useState<Record<string, "extracting" | "captured" | "error">>({});

  useEffect(() => {
    if (state.kind !== "ready") return;
    const messages = state.messages;
    if (messages.length === 0) return;

    // First successful fetch: stamp every message ID as "initial" so we don't
    // auto-process the user's existing backlog.
    if (initialIdsRef.current === null) {
      initialIdsRef.current = new Set(messages.map((m) => m.id));
      // Also seed any messages already in the captured store so we don't double-process.
      const captured = loadCaptured();
      const alreadyCaptured = new Set(
        captured
          .filter((c) => c.source.kind === "gmail")
          .map((c) => c.source.kind === "gmail" && c.source.messageId)
          .filter((s): s is string => typeof s === "string")
      );
      const initialStatus: Record<string, "captured"> = {};
      messages.forEach((m) => {
        if (alreadyCaptured.has(m.id)) initialStatus[m.id] = "captured";
      });
      if (Object.keys(initialStatus).length) setAutoStatus((s) => ({ ...s, ...initialStatus }));
      return;
    }

    // Settings gate.
    const settings = loadAutomation();
    if (!settings.autoExtractFields) return;

    // Subsequent fetches: anything not in the initial set is "new". Auto-extract
    // PDFs we haven't seen.
    const captured = loadCaptured();
    const capturedMessageIds = new Set(
      captured
        .filter((c) => c.source.kind === "gmail")
        .map((c) => c.source.kind === "gmail" && c.source.messageId)
        .filter((s): s is string => typeof s === "string")
    );

    for (const m of messages) {
      if (initialIdsRef.current.has(m.id)) continue;
      if (capturedMessageIds.has(m.id)) {
        if (autoStatus[m.id] !== "captured") setAutoStatus((s) => ({ ...s, [m.id]: "captured" }));
        continue;
      }
      if (inFlightRef.current.has(m.id)) continue;
      const pdf = m.attachments.find((a) => /pdf/i.test(a.mimeType) || /\.pdf$/i.test(a.filename));
      if (!pdf) continue;
      inFlightRef.current.add(m.id);
      setAutoStatus((s) => ({ ...s, [m.id]: "extracting" }));
      autoExtract(m, pdf)
        .then(() => setAutoStatus((s) => ({ ...s, [m.id]: "captured" })))
        .catch(() => setAutoStatus((s) => ({ ...s, [m.id]: "error" })))
        .finally(() => inFlightRef.current.delete(m.id));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

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
            const auto = autoStatus[m.id];
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
                <div className="mt-1 flex items-center gap-2 text-[11px] text-muted flex-wrap">
                  {m.attachmentNames.length > 0 && (
                    <span className="flex items-center gap-1">
                      <Paperclip className="w-3 h-3" /> {m.attachmentNames[0]}
                      {m.attachmentNames.length > 1 && ` +${m.attachmentNames.length - 1}`}
                    </span>
                  )}
                  {auto === "extracting" && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-brand-soft text-brand font-medium">
                      <span className="w-2 h-2 rounded-full bg-brand animate-pulse" /> Auto-extracting…
                    </span>
                  )}
                  {auto === "captured" && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium">
                      <Check className="w-2.5 h-2.5" /> In bills queue
                    </span>
                  )}
                  {auto === "error" && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 font-medium">
                      <AlertCircle className="w-2.5 h-2.5" /> Auto-extract failed
                    </span>
                  )}
                </div>
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
  // Subscribe to ANY registry change so this pane re-renders while a background
  // auto-extract on one of this message's attachments is still streaming. We
  // pass null to the hook because we want subscription only — the actual lookup
  // per attachment happens inside the .map below.
  useStreamEntry(null);

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
      duplicateOfBillId: null,
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
                // Read the singleton registry so an in-flight auto-extract
                // surfaces its live partial in this pane too.
                const auto = getStream(a.attachmentId);
                const autoStreaming = !!auto?.streaming;
                const isStreamingHere =
                  (stream.streaming && activeAttachmentId === a.attachmentId) || autoStreaming;
                const partialHere =
                  activeAttachmentId === a.attachmentId
                    ? stream.partial
                    : auto?.extracted ?? auto?.partial ?? null;
                const errorHere =
                  (activeAttachmentId === a.attachmentId ? stream.error : null) ?? auto?.error ?? null;
                const saved = savedAttachmentIds.has(a.attachmentId) || !!auto?.extracted;
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
                      <div className="px-4 pb-4 pt-1 bg-surface/50">
                        <ExtractedFieldsCard
                          data={display}
                          streaming={isStreamingHere}
                          elapsedMs={isStreamingHere ? stream.elapsedMs : null}
                        />
                      </div>
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

// Background extraction for newly-arrived messages. Uses the streaming endpoint
// AND publishes partial state to the extract-registry so the right-pane
// MessageDetail can render the same field-by-field reveal if the user clicks
// the row mid-flight. On done, persists the captured invoice — bills-queue
// auto-coding takes over from there.
async function autoExtract(message: LiveMessage, attachment: LiveAttachment): Promise<void> {
  const attId = attachment.attachmentId;
  const entry = startStream(attId);
  const startedAt = entry.startedAt;

  let res: Response;
  try {
    res = await fetch("/api/extract/stream", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source: "gmail", messageId: message.id, attachmentId: attId }),
    });
  } catch (e) {
    updateStream(attId, { streaming: false, error: (e as Error).message });
    throw e;
  }

  if (!res.ok || !res.body) {
    const data = await res.json().catch(() => ({}));
    const msg = (data as { error?: string }).error ?? `HTTP ${res.status}`;
    updateStream(attId, { streaming: false, error: msg });
    throw new Error(msg);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let extracted: ExtractedInvoice | null = null;
  let streamError: string | null = null;

  outer: while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let idx;
    while ((idx = buffer.indexOf("\n\n")) >= 0) {
      const block = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);
      let event = "message";
      let dataRaw = "";
      for (const line of block.split("\n")) {
        if (line.startsWith("event:")) event = line.slice(6).trim();
        else if (line.startsWith("data:")) dataRaw += line.slice(5).trim();
      }
      if (!dataRaw) continue;
      let data: { raw?: string; extracted?: ExtractedInvoice; error?: string } = {};
      try {
        data = JSON.parse(dataRaw);
      } catch {
        continue;
      }
      const elapsed = Math.round(performance.now() - startedAt);
      if (event === "text" && typeof data.raw === "string") {
        const cleaned = data.raw.replace(/^```(?:json)?\s*/i, "");
        let partial: Partial<ExtractedInvoice> | null = null;
        try {
          partial = parsePartial(cleaned, Allow.ALL) as Partial<ExtractedInvoice>;
        } catch {
          /* keep previous partial */
        }
        updateStream(attId, { partial, elapsedMs: elapsed });
      } else if (event === "done" && data.extracted) {
        extracted = data.extracted;
        updateStream(attId, {
          partial: data.extracted,
          extracted: data.extracted,
          streaming: false,
          elapsedMs: elapsed,
        });
        break outer;
      } else if (event === "error") {
        streamError = data.error ?? "stream error";
        updateStream(attId, { streaming: false, error: streamError, elapsedMs: elapsed });
        break outer;
      }
    }
  }

  if (streamError) throw new Error(streamError);
  if (!extracted) throw new Error("Stream ended without a parsed extraction.");

  const fromName = message.from.replace(/<.*>$/, "").replace(/^"|"$/g, "").trim() || message.from;
  const fromEmail = message.from.match(/<([^>]+)>/)?.[1] ?? message.from;

  const meta = newCaptured();
  addCaptured({
    id: meta.id,
    createdAt: meta.createdAt,
    status: "extracted",
    source: {
      kind: "gmail",
      messageId: message.id,
      attachmentId: attId,
      fromEmail,
      fromName,
      subject: message.subject,
    },
    vendorName: extracted.vendor_name,
    vendorEmail: extracted.vendor_email,
    invoiceNumber: extracted.invoice_number,
    issueDate: extracted.issue_date,
    dueDate: extracted.due_date,
    poNumber: null,
    projectRefRaw: extracted.project_ref,
    subtotal: extracted.subtotal,
    tax: extracted.tax,
    total: extracted.total,
    currency: extracted.currency,
    lines: (extracted.line_items ?? []).map((li) => ({
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
    duplicateOfBillId: null,
  });
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

