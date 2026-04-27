"use client";
import { useCallback, useRef, useState } from "react";
import { Upload, X, FileText, Check, AlertCircle, Sparkles } from "lucide-react";
import { addCaptured, newCaptured } from "@/lib/captured-store";
import { cn } from "@/lib/utils";

type Phase = "idle" | "uploading" | "extracting" | "done" | "error";

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
  const [error, setError] = useState<string | null>(null);
  const [doneFile, setDoneFile] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);
      setPhase("uploading");
      try {
        const buf = await file.arrayBuffer();
        const base64 = bytesToBase64(new Uint8Array(buf));
        setPhase("extracting");
        const res = await fetch("/api/extract/invoice", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ source: "upload", base64 }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
        const ex = data.extracted as {
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
          line_items: Array<{
            description: string;
            quantity: number | null;
            unit_price: number | null;
            amount: number | null;
            project_ref: string | null;
          }>;
        };
        const meta = newCaptured();
        addCaptured({
          id: meta.id,
          createdAt: meta.createdAt,
          status: "extracted",
          source: { kind: "upload", fileName: file.name, sizeKb: Math.round(file.size / 1024) },
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
          lines: ex.line_items.map((li) => ({
            description: li.description,
            quantity: li.quantity,
            unitPrice: li.unit_price,
            amount: li.amount,
            projectRef: li.project_ref,
          })),
          qboVendorId: null,
          qboVendorName: null,
          qboProjectId: null,
          qboProjectName: null,
          qboAccountId: null,
          qboAccountName: null,
          qboBillId: null,
          postedAt: null,
          errorMessage: null,
        });
        setDoneFile(file.name);
        setPhase("done");
        setTimeout(() => {
          onUploaded();
          onClose();
          setPhase("idle");
          setDoneFile(null);
        }, 1100);
      } catch (e) {
        setError((e as Error).message);
        setPhase("error");
      }
    },
    [onClose, onUploaded]
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-[2px] grid place-items-center p-6">
      <div className="w-full max-w-[540px] bg-background rounded-2xl border border-border shadow-[0_24px_64px_rgba(15,23,42,0.25)] overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
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
            onClick={() => {
              if (phase === "uploading" || phase === "extracting") return;
              onClose();
              setPhase("idle");
              setError(null);
            }}
            className="w-8 h-8 rounded-full hover:bg-surface grid place-items-center text-muted"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5">
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
            onClick={() => phase === "idle" && inputRef.current?.click()}
            className={cn(
              "rounded-xl border-2 border-dashed transition-colors p-8 grid place-items-center text-center",
              phase === "idle" && "cursor-pointer",
              dragOver
                ? "border-brand bg-brand-soft/40"
                : phase === "error"
                  ? "border-rose-300 bg-rose-50"
                  : "border-border hover:border-foreground/30 hover:bg-surface"
            )}
          >
            {phase === "done" && (
              <>
                <div className="w-12 h-12 rounded-full bg-emerald-600 text-white grid place-items-center">
                  <Check className="w-6 h-6" />
                </div>
                <div className="mt-3 text-[14px] font-medium">{doneFile} sent to bills queue</div>
                <div className="mt-1 text-[12px] text-muted">Match it to a vendor and project, then post.</div>
              </>
            )}
            {(phase === "uploading" || phase === "extracting") && (
              <>
                <div className="w-12 h-12 rounded-full bg-brand text-white grid place-items-center">
                  <Sparkles className="w-6 h-6 animate-pulse" />
                </div>
                <div className="mt-3 text-[14px] font-medium">
                  {phase === "uploading" ? "Reading file…" : "Claude is extracting fields…"}
                </div>
                <div className="mt-1 text-[12px] text-muted">Vendor, line items, totals, project reference.</div>
              </>
            )}
            {phase === "error" && (
              <>
                <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-700 grid place-items-center">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <div className="mt-3 text-[14px] font-medium text-rose-800">Extraction failed</div>
                <div className="mt-1 text-[12px] text-rose-700 max-w-md">{error}</div>
                <button
                  onClick={() => {
                    setPhase("idle");
                    setError(null);
                  }}
                  className="mt-3 text-[12.5px] underline text-rose-800"
                >
                  Try another file
                </button>
              </>
            )}
            {phase === "idle" && (
              <>
                <div className="w-12 h-12 rounded-full bg-surface border border-border grid place-items-center">
                  <FileText className="w-6 h-6 text-muted" />
                </div>
                <div className="mt-3 text-[14px] font-medium">Drag a PDF here</div>
                <div className="mt-1 text-[12px] text-muted">or click to browse · PDF only · up to 20 MB</div>
              </>
            )}
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

          <div className="mt-4 text-[11.5px] text-muted leading-relaxed">
            We&apos;ll extract the vendor, invoice number, line items, totals, and project / job reference, then drop it
            into your bills queue ready for review.
          </div>
        </div>
      </div>
    </div>
  );
}

function bytesToBase64(bytes: Uint8Array): string {
  // Chunked encoding so very large PDFs don't blow the call stack.
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return typeof btoa !== "undefined" ? btoa(binary) : Buffer.from(binary, "binary").toString("base64");
}
