// Handler: extract_invoice_fields
//
// Pulls the first PDF (or image) attachment out of parsed_json, sends it
// to Claude, and writes the structured fields back to
// inbox_messages.extracted_fields. Marked as 'skipped' if no usable
// attachment is present (e.g. a body-only invoice email).

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { extractInvoiceFromPdf } from "@/lib/integrations/extract";
import type { HandlerCtx, HandlerResult } from "./index";
import type { JobPayloads } from "../types";

export async function extractInvoiceFields(
  payload: JobPayloads["extract_invoice_fields"],
  _ctx: HandlerCtx
): Promise<HandlerResult> {
  const admin = createSupabaseAdminClient();

  const { data: msg, error: fetchErr } = await admin
    .from("inbox_messages")
    .select("id, parsed_json, extracted_fields, extraction_status")
    .eq("id", payload.inboxMessageId)
    .maybeSingle();
  if (fetchErr) return { status: "failed", error: fetchErr.message };
  if (!msg) return { status: "failed", error: "inbox_message not found" };

  // Idempotency: if extraction already succeeded, skip (re-running would
  // just spend another Claude call). On failure we fall through and try
  // again per the queue's retry/backoff policy.
  if (msg.extraction_status === "done" && msg.extracted_fields) {
    return { status: "done", result: { skipped: "already_extracted" } };
  }

  const parsed = (msg.parsed_json ?? {}) as {
    attachments?: Array<{ base64?: string; mimeType?: string; filename?: string }>;
  };
  const pdf = parsed.attachments?.find(
    (a) => typeof a.base64 === "string" && (a.mimeType?.includes("pdf") || a.filename?.toLowerCase().endsWith(".pdf"))
  );
  if (!pdf?.base64) {
    await admin
      .from("inbox_messages")
      .update({
        extraction_status: "skipped",
        extraction_error: "no PDF attachment with inline base64",
      })
      .eq("id", msg.id);
    return { status: "done", result: { skipped: "no_pdf" } };
  }

  // Mark in-flight so the UI can show a progress badge if it likes.
  await admin
    .from("inbox_messages")
    .update({ extraction_status: "extracting", extraction_error: null })
    .eq("id", msg.id);

  try {
    const fields = await extractInvoiceFromPdf(pdf.base64);
    await admin
      .from("inbox_messages")
      .update({
        extracted_fields: fields,
        extraction_status: "done",
        extraction_error: null,
      })
      .eq("id", msg.id);
    return { status: "done", result: { vendor: fields.vendor_name, total: fields.total } };
  } catch (e) {
    await admin
      .from("inbox_messages")
      .update({
        extraction_status: "failed",
        extraction_error: (e as Error).message,
      })
      .eq("id", msg.id);
    return { status: "failed", error: (e as Error).message };
  }
}
