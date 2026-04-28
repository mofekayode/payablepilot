"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Upload, X, FileText, Check, AlertCircle, ArrowRight } from "lucide-react";
import { addCaptured, newCaptured } from "@/lib/captured-store";
import { useExtractStream, type ExtractedInvoice } from "@/lib/use-extract-stream";
import { ExtractedFieldsCard } from "./extracted-fields-card";
import { cn } from "@/lib/utils";

type Phase = "idle" | "reading" | "extracting" | "saved" | "error";

export function UploadInvoiceModalLive({
  open,
  onClose,
  onUploaded,
}: {
  open: boolean;
  onClose: () => void;
  onUploaded: () => void;
}) {
  const [dragOver, setDragOver] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [fileName, setFileName] = useState<string | null>(null);
  const [readError, setReadError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const stream = useExtractStream();
  const savedRef = useRef(false);

  // Once Claude finishes streaming, persist the captured invoice and shift to
  // the "saved" phase. The button-row in saved state lets the user keep the
  // modal open or jump to the Bills queue.
  useEffect(() => {
    if (!stream.extracted || savedRef.current || !fileName) return;
    savedRef.current = true;
    const meta = newCaptured();
    const ex = stream.extracted;
    addCaptured({
      id: meta.id,
      createdAt: meta.createdAt,
      status: "extracted",
      source: { kind: "upload", fileName, sizeKb: 0 },
      vendorName: ex.vendor_name,
      vendorEmail: ex.vendor_email,
      invoiceNumber: ex.invoice_number,
      issueDate: ex.issue_date,
      dueDate: ex.due_date,
      poNumber: null,
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
    setPhase("saved");
  }, [stream.extracted, fileName]);

  useEffect(() => {
    if (stream.error) setPhase("error");
  }, [stream.error]);

  const handleFile = useCallback(
    async (file: File) => {
      setReadError(null);
      setFileName(file.name);
      savedRef.current = false;
      setPhase("reading");
      try {
        const buf = await file.arrayBuffer();
        const base64 = bytesToBase64(new Uint8Array(buf));
        setPhase("extracting");
        await stream.run({ source: "upload", base64 });
      } catch (e) {
        setReadError((e as Error).message);
        setPhase("error");
      }
    },
    [stream]
  );

  const reset = useCallback(() => {
    stream.reset();
    setPhase("idle");
    setFileName(null);
    setReadError(null);
    savedRef.current = false;
  }, [stream]);

  const close = useCallback(() => {
    if (phase === "reading" || phase === "extracting") return;
    onClose();
    // Reset on next tick so animations don't flash.
    setTimeout(reset, 100);
  }, [phase, onClose, reset]);

  if (!open) return null;

  const showFields = phase === "extracting" || phase === "saved" || (phase === "error" && stream.partial);

  return (
    <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-[2px] grid place-items-center p-6">
      <div className="w-full max-w-[640px] max-h-[calc(100vh-3rem)] bg-background rounded-2xl border border-border shadow-[0_24px_64px_rgba(15,23,42,0.25)] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md bg-foreground text-background grid place-items-center">
              <Upload className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[14.5px] font-semibold tracking-tight">Upload an invoice</div>
              <div className="text-[11.5px] text-muted">For invoices that don&apos;t come through email</div>
            </div>
          </div>
          <button
            onClick={close}
            disabled={phase === "reading" || phase === "extracting"}
            className="w-8 h-8 rounded-full hover:bg-surface grid place-items-center text-muted disabled:opacity-30"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-5 space-y-4">
          {phase === "idle" && (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                const f = e.dataTransfer.files?.[0];
                if (f) handleFile(f);
              }}
              onClick={() => inputRef.current?.click()}
              className={cn(
                "rounded-xl border-2 border-dashed transition-colors p-8 grid place-items-center text-center cursor-pointer",
                dragOver ? "border-brand bg-brand-soft/40" : "border-border hover:border-foreground/30 hover:bg-surface"
              )}
            >
              <div className="w-12 h-12 rounded-full bg-surface border border-border grid place-items-center">
                <FileText className="w-6 h-6 text-muted" />
              </div>
              <div className="mt-3 text-[14px] font-medium">Drag a PDF here</div>
              <div className="mt-1 text-[12px] text-muted">or click to browse · PDF only · up to 20 MB</div>
              <input
                ref={inputRef}
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                  e.target.value = "";
                }}
              />
            </div>
          )}

          {phase !== "idle" && fileName && (
            <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-border bg-surface">
              <div className="w-9 h-9 rounded bg-background grid place-items-center shrink-0">
                <FileText className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1 text-[13px] font-medium truncate">{fileName}</div>
              {phase === "saved" && (
                <span className="inline-flex items-center gap-1 text-[11.5px] font-medium text-emerald-700">
                  <Check className="w-3.5 h-3.5" /> Saved to bills queue
                </span>
              )}
            </div>
          )}

          {phase === "reading" && (
            <div className="rounded-lg border border-dashed border-border p-6 text-center">
              <div className="w-10 h-10 rounded-full border-2 border-brand border-t-transparent animate-spin mx-auto" />
              <div className="mt-3 text-[13.5px] font-medium">Reading file…</div>
            </div>
          )}

          {showFields && (
            <ExtractedFieldsCard
              data={(stream.partial ?? {}) as Partial<ExtractedInvoice>}
              streaming={phase === "extracting"}
              elapsedMs={stream.elapsedMs}
            />
          )}

          {phase === "error" && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-[12.5px] text-rose-800 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <div className="flex-1">
                <div className="font-semibold">Extraction failed</div>
                <div className="mt-0.5">{stream.error ?? readError ?? "Unknown error"}</div>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 px-5 py-3 border-t border-border bg-surface/40 shrink-0">
          <div className="text-[11.5px] text-muted">
            {phase === "saved"
              ? "Auto-coding will run against your QuickBooks vendors and projects on the bills queue."
              : phase === "extracting" || phase === "reading"
                ? "Hang tight — fields appear as the agent reads them."
                : "We extract vendor, totals, line items, and any project / job reference."}
          </div>
          {phase === "saved" && (
            <button
              onClick={() => {
                onUploaded();
                close();
              }}
              className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-md bg-foreground text-background text-[12.5px] font-medium hover:opacity-90 whitespace-nowrap shrink-0"
            >
              Open bills queue <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
          {phase === "error" && (
            <button
              onClick={reset}
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md border border-border text-[12.5px] hover:bg-background"
            >
              Try another file
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return typeof btoa !== "undefined" ? btoa(binary) : Buffer.from(binary, "binary").toString("base64");
}
