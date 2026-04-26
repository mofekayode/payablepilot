"use client";
import { useCallback, useRef, useState } from "react";
import { Upload, X, FileText, Check } from "lucide-react";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

export function UploadInvoiceModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { uploadInvoice } = useStore();
  const [dragOver, setDragOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      const list = Array.from(files);
      if (!list.length) return;
      setBusy(true);
      // Brief delay to simulate the upload + extraction handoff.
      for (const f of list) {
        await new Promise((r) => setTimeout(r, 600));
        uploadInvoice(f.name, Math.max(1, Math.round(f.size / 1024)));
      }
      setBusy(false);
      setDone(list.length === 1 ? list[0].name : `${list.length} files`);
      setTimeout(() => {
        setDone(null);
        onClose();
      }, 900);
    },
    [uploadInvoice, onClose]
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-[2px] grid place-items-center p-6 animate-fade-in-up">
      <div className="w-full max-w-[520px] bg-background rounded-2xl border border-border shadow-[0_24px_64px_rgba(15,23,42,0.25)] overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md bg-foreground text-background grid place-items-center">
              <Upload className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[14.5px] font-semibold tracking-tight">Upload invoice</div>
              <div className="text-[11.5px] text-muted">For invoices that don&apos;t come through email</div>
            </div>
          </div>
          <button
            onClick={onClose}
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
              if (e.dataTransfer.files?.length) handleFiles(e.dataTransfer.files);
            }}
            onClick={() => inputRef.current?.click()}
            className={cn(
              "rounded-xl border-2 border-dashed transition-colors p-8 grid place-items-center text-center cursor-pointer",
              dragOver
                ? "border-brand bg-brand-soft/40"
                : "border-border hover:border-foreground/30 hover:bg-surface"
            )}
          >
            {done ? (
              <>
                <div className="w-12 h-12 rounded-full bg-brand text-white grid place-items-center">
                  <Check className="w-6 h-6" />
                </div>
                <div className="mt-3 text-[14px] font-medium">{done} queued for extraction</div>
                <div className="mt-1 text-[12px] text-muted">PayablePilot will match it against your POs.</div>
              </>
            ) : busy ? (
              <>
                <div className="w-10 h-10 rounded-full border-2 border-brand border-t-transparent animate-spin" />
                <div className="mt-3 text-[14px] font-medium">Uploading…</div>
              </>
            ) : (
              <>
                <div className="w-12 h-12 rounded-full bg-surface border border-border grid place-items-center">
                  <FileText className="w-6 h-6 text-muted" />
                </div>
                <div className="mt-3 text-[14px] font-medium">Drag a PDF or image here</div>
                <div className="mt-1 text-[12px] text-muted">or click to browse · PDF, PNG, JPG · up to 20 MB</div>
              </>
            )}
            <input
              ref={inputRef}
              type="file"
              multiple
              accept="application/pdf,image/png,image/jpeg"
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.length) handleFiles(e.target.files);
                e.target.value = "";
              }}
            />
          </div>

          <div className="mt-4 text-[11.5px] text-muted leading-relaxed">
            We&apos;ll extract the vendor, invoice number, line items, totals, and PO reference, then route it through the same matching pipeline as email invoices.
          </div>
        </div>
      </div>
    </div>
  );
}
