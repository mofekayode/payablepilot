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
} from "lucide-react";
import Link from "next/link";
import type { LiveView } from "../sidebar-live";
import { cn } from "@/lib/utils";
import { UploadInvoiceModalLive } from "../upload-invoice-modal-live";

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
};

type State =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready"; messages: InboxMessage[] };

export function InboxLiveView({ onNavigate }: { onNavigate: (v: LiveView) => void }) {
  void onNavigate; // kept for sidebar compatibility
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
      if (incoming.length && !openId) setOpenId(incoming[0].id);
    } catch (e) {
      if (opts.silent) return;
      setState({ kind: "error", message: (e as Error).message });
    }
  }, [openId]);

  useEffect(() => {
    fetchInbox();
    // Soft background refresh every 30s. The real-time path is the
    // Push webhook → DB write; this just keeps the open page in sync
    // without aggressive polling.
    const t = setInterval(() => fetchInbox({ silent: true }), 30_000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const messages = state.kind === "ready" ? state.messages : [];
  const open = messages.find((m) => m.id === openId) ?? null;

  return (
    <div className="grid grid-cols-[380px_1fr] h-full min-h-0">
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
                {m.snippet && (
                  <div className="mt-0.5 text-[11.5px] text-muted line-clamp-1">{m.snippet}</div>
                )}
                <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                  <RoutingBadge status={m.routingStatus} confidence={m.routingConfidence} />
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
      <div className="mt-2 flex items-center gap-3 text-[13px] text-muted">
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

      <div className="mt-3">
        <RoutingBadge status={message.routingStatus} confidence={message.routingConfidence} />
      </div>

      {message.snippet && (
        <div className="mt-6 rounded-lg border border-border bg-background p-4 text-[13.5px] leading-relaxed text-foreground">
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

      <div className="mt-8 rounded-lg border border-border bg-background p-4 text-[12.5px] text-muted leading-relaxed">
        <div className="font-medium text-foreground mb-1">What's next</div>
        Field extraction (vendor, amount, line items, GL coding) and "Post to QuickBooks" wire up next.
        For now you can see the message has been routed correctly. Wrong client?{" "}
        <span className="text-foreground">Re-assign coming soon.</span>
      </div>
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

function formatBytes(n: number): string {
  if (!n) return "";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}
