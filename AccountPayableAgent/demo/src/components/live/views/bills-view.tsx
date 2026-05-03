"use client";
import { useCallback, useEffect, useState } from "react";
import {
  CreditCard,
  RefreshCw,
  Loader2,
  Check,
  AlertCircle,
  ExternalLink,
  Sparkles,
  Receipt,
  ArrowUpRight,
} from "lucide-react";
import type { LiveView } from "../sidebar-live";
import { cn } from "@/lib/utils";
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

type Bill = {
  id: string;
  fromEmail: string | null;
  fromName: string | null;
  subject: string | null;
  receivedAt: string | null;
  extractionStatus: "pending" | "extracting" | "done" | "failed" | "skipped";
  extractionError: string | null;
  extractedFields: ExtractedFields;
  postedAt: string | null;
  qboBillId: string | null;
  qboVendorId: string | null;
  qboProjectId: string | null;
  postingError: string | null;
};

type State =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready"; bills: Bill[] };

export function BillsView({
  onNavigate,
  activeBusinessId,
}: {
  onNavigate: (v: LiveView) => void;
  activeBusinessId: string | null;
}) {
  void onNavigate;
  const [state, setState] = useState<State>({ kind: "idle" });
  const [posting, setPosting] = useState<Record<string, boolean>>({});
  const [transientError, setTransientError] = useState<Record<string, string>>({});

  const fetchBills = useCallback(async (opts: { silent?: boolean } = {}) => {
    if (!opts.silent) setState({ kind: "loading" });
    try {
      const res = await fetch("/api/bills", { cache: "no-store" });
      if (!res.ok) {
        if (opts.silent) return;
        const text = await res.text();
        setState({ kind: "error", message: text || `HTTP ${res.status}` });
        return;
      }
      const data = (await res.json()) as { bills: Bill[] };
      setState({ kind: "ready", bills: data.bills ?? [] });
    } catch (e) {
      if (opts.silent) return;
      setState({ kind: "error", message: (e as Error).message });
    }
  }, []);

  useEffect(() => {
    fetchBills();
  }, [activeBusinessId, fetchBills]);

  // Realtime: any change to inbox_messages for the active business
  // (extraction completing, a bill posting) auto-refreshes this view.
  useEffect(() => {
    if (!activeBusinessId) return;
    const supabase = createSupabaseBrowserClient();
    const channel = supabase
      .channel(`bills-${activeBusinessId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "inbox_messages",
          filter: `business_id=eq.${activeBusinessId}`,
        },
        () => fetchBills({ silent: true })
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeBusinessId, fetchBills]);

  async function postBill(billId: string) {
    setPosting((p) => ({ ...p, [billId]: true }));
    setTransientError((e) => {
      const next = { ...e };
      delete next[billId];
      return next;
    });
    try {
      const res = await fetch("/api/bills/post", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ inboxMessageId: billId }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        duplicate?: boolean;
        existingBillId?: string;
      };
      if (!res.ok || !data.ok) {
        setTransientError((e) => ({
          ...e,
          [billId]:
            data.error ??
            (data.duplicate
              ? `Duplicate of QBO Bill ${data.existingBillId}.`
              : `Post failed (HTTP ${res.status}).`),
        }));
      }
    } catch (e) {
      setTransientError((errs) => ({ ...errs, [billId]: (e as Error).message }));
    } finally {
      setPosting((p) => {
        const next = { ...p };
        delete next[billId];
        return next;
      });
      fetchBills({ silent: true });
    }
  }

  const bills = state.kind === "ready" ? state.bills : [];
  const ready = bills.filter((b) => !b.postedAt && b.extractionStatus === "done");
  const inFlight = bills.filter((b) => !b.postedAt && b.extractionStatus !== "done");
  const posted = bills.filter((b) => b.postedAt);

  return (
    <div className="h-full overflow-auto scrollbar-thin">
      <div className="max-w-[1100px] mx-auto px-8 py-8 space-y-7">
        <div className="flex items-end justify-between flex-wrap gap-4">
          <div>
            <div className="text-[11px] uppercase tracking-wider text-muted">Bills to post</div>
            <h1 className="mt-1 text-[28px] font-semibold tracking-tight">
              {ready.length === 0
                ? inFlight.length > 0
                  ? "Working on it…"
                  : "All caught up."
                : `${ready.length} bill${ready.length === 1 ? "" : "s"} ready to post.`}
            </h1>
          </div>
          <button
            onClick={() => fetchBills()}
            disabled={state.kind === "loading"}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md border border-border bg-background text-[13px] hover:bg-surface"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", state.kind === "loading" && "animate-spin")} />
            Refresh
          </button>
        </div>

        {state.kind === "error" && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-[13px] text-rose-800 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" /> {state.message}
          </div>
        )}

        {ready.length > 0 && (
          <Section title="Ready to post">
            {ready.map((b) => (
              <BillRow
                key={b.id}
                bill={b}
                posting={!!posting[b.id]}
                error={transientError[b.id]}
                onPost={() => postBill(b.id)}
              />
            ))}
          </Section>
        )}

        {inFlight.length > 0 && (
          <Section title="Extracting">
            {inFlight.map((b) => (
              <BillRow
                key={b.id}
                bill={b}
                posting={false}
                error={transientError[b.id]}
                onPost={() => postBill(b.id)}
              />
            ))}
          </Section>
        )}

        {posted.length > 0 && (
          <Section title="Recently posted">
            {posted.slice(0, 20).map((b) => (
              <BillRow
                key={b.id}
                bill={b}
                posting={false}
                error={undefined}
                onPost={() => postBill(b.id)}
              />
            ))}
          </Section>
        )}

        {state.kind === "ready" && bills.length === 0 && <EmptyState />}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="text-[11px] uppercase tracking-[0.18em] text-muted font-semibold mb-3">{title}</div>
      <div className="rounded-xl border border-border bg-background overflow-hidden divide-y divide-border">
        {children}
      </div>
    </section>
  );
}

function BillRow({
  bill,
  posting,
  error,
  onPost,
}: {
  bill: Bill;
  posting: boolean;
  error: string | undefined;
  onPost: () => void;
}) {
  const f = bill.extractedFields;
  const vendor = f?.vendor_name || bill.fromName || bill.fromEmail || "—";
  const total = f?.total ?? null;
  const project = f?.project_ref ?? null;
  const invoiceNumber = f?.invoice_number ?? null;
  const dueDate = f?.due_date ?? null;
  const isPosted = !!bill.postedAt;
  const isExtracting = bill.extractionStatus === "extracting" || bill.extractionStatus === "pending";
  const isFailed = bill.extractionStatus === "failed";
  const isSkipped = bill.extractionStatus === "skipped";

  return (
    <div className="p-4">
      <div className="flex flex-wrap items-start gap-4">
        <div className="w-9 h-9 rounded-md bg-surface border border-border grid place-items-center shrink-0">
          <Receipt className="w-4 h-4 text-muted" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[14.5px] font-semibold tracking-tight truncate">{vendor}</span>
            {invoiceNumber && (
              <span className="text-[11.5px] text-muted font-mono">#{invoiceNumber}</span>
            )}
            {project && (
              <span className="inline-flex items-center text-[10.5px] font-medium px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                {project}
              </span>
            )}
            {isPosted && (
              <span className="inline-flex items-center gap-1 text-[10.5px] font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                <Check className="w-3 h-3" /> Posted
                {bill.qboBillId && (
                  <span className="font-mono text-emerald-600/80">QBO #{bill.qboBillId}</span>
                )}
              </span>
            )}
            {isExtracting && (
              <span className="inline-flex items-center gap-1 text-[10.5px] font-medium px-1.5 py-0.5 rounded bg-brand-soft text-brand">
                <Loader2 className="w-2.5 h-2.5 animate-spin" /> Extracting
              </span>
            )}
            {isFailed && (
              <span className="inline-flex items-center gap-1 text-[10.5px] font-medium px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200">
                <AlertCircle className="w-2.5 h-2.5" /> Extraction failed
              </span>
            )}
            {isSkipped && (
              <span className="inline-flex items-center gap-1 text-[10.5px] font-medium px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-600">
                No PDF
              </span>
            )}
          </div>
          <div className="mt-0.5 text-[12.5px] text-muted truncate">
            {bill.subject || "(no subject)"}
            {dueDate && <span> · due {dueDate}</span>}
          </div>
          {bill.postingError && !isPosted && (
            <div className="mt-1.5 text-[11.5px] text-rose-700 flex items-start gap-1.5">
              <AlertCircle className="w-3 h-3 mt-0.5 shrink-0" /> {bill.postingError}
            </div>
          )}
          {bill.extractionError && isFailed && (
            <div className="mt-1.5 text-[11.5px] text-rose-700 flex items-start gap-1.5">
              <AlertCircle className="w-3 h-3 mt-0.5 shrink-0" /> {bill.extractionError}
            </div>
          )}
          {error && (
            <div className="mt-1.5 text-[11.5px] text-rose-700 flex items-start gap-1.5">
              <AlertCircle className="w-3 h-3 mt-0.5 shrink-0" /> {error}
            </div>
          )}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {total != null && (
            <div className="text-right">
              <div className="text-[10.5px] uppercase tracking-wider text-muted">Total</div>
              <div className="text-[16px] font-semibold tabular-nums">
                {formatMoney(total, f?.currency ?? null)}
              </div>
            </div>
          )}
          {!isPosted && bill.extractionStatus === "done" ? (
            <button
              onClick={onPost}
              disabled={posting}
              className="inline-flex items-center gap-1.5 h-9 px-4 rounded-md bg-foreground text-background text-[13px] font-medium hover:opacity-90 disabled:opacity-60"
            >
              {posting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowUpRight className="w-4 h-4" />}
              {posting ? "Posting…" : "Post to QuickBooks"}
            </button>
          ) : isPosted ? (
            <a
              href="https://app.qbo.intuit.com/app/bills"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md border border-border bg-background text-[13px] hover:bg-surface"
            >
              View in QBO <ExternalLink className="w-3.5 h-3.5" />
            </a>
          ) : (
            <span className="text-[12px] text-muted h-9 grid place-items-center px-2">
              Waiting for extraction…
            </span>
          )}
        </div>
      </div>

      {f?.line_items && f.line_items.length > 0 && (
        <div className="mt-3 pt-3 border-t border-border/40">
          <div className="text-[10.5px] uppercase tracking-wider text-muted font-semibold mb-1.5">
            Line items ({f.line_items.length})
          </div>
          <div className="space-y-1 text-[12.5px]">
            {f.line_items.slice(0, 4).map((li, i) => (
              <div key={i} className="flex items-center justify-between gap-3">
                <span className="text-foreground truncate">{li.description}</span>
                <span className="text-muted tabular-nums shrink-0">
                  {li.amount != null ? formatMoney(li.amount, f.currency ?? null) : "—"}
                </span>
              </div>
            ))}
            {f.line_items.length > 4 && (
              <div className="text-[11.5px] text-muted">
                + {f.line_items.length - 4} more line item{f.line_items.length - 4 === 1 ? "" : "s"}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-xl border border-border bg-background p-10 text-center">
      <CreditCard className="w-7 h-7 text-muted/60 mx-auto mb-3" />
      <div className="text-[15px] font-semibold mb-1">No bills yet</div>
      <div className="text-[13px] text-muted">
        Once an invoice email arrives, it'll be extracted and show up here ready to post.
      </div>
      <div className="mt-3 text-[12px] text-muted inline-flex items-center gap-1.5">
        <Sparkles className="w-3.5 h-3.5 text-brand" />
        Real-time via Pub/Sub. Hourly poll as a safety net.
      </div>
    </div>
  );
}

function formatMoney(amount: number, currency: string | null): string {
  const code = currency && currency.length === 3 ? currency : "USD";
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: code }).format(amount);
  } catch {
    return `${amount} ${code}`;
  }
}
