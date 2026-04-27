// Invoice field extraction via Claude vision API.
// Sends a PDF (base64) to Claude with a strict JSON schema prompt.

import Anthropic from "@anthropic-ai/sdk";

export type ExtractedLineItem = {
  description: string;
  quantity: number | null;
  unit_price: number | null;
  amount: number | null;
  project_ref: string | null;
};

export type ExtractedInvoice = {
  vendor_name: string | null;
  vendor_email: string | null;
  invoice_number: string | null;
  issue_date: string | null; // ISO date, YYYY-MM-DD
  due_date: string | null;
  po_number: string | null;
  project_ref: string | null;
  subtotal: number | null;
  tax: number | null;
  total: number | null;
  currency: string | null;
  line_items: ExtractedLineItem[];
  raw_text_snippet: string | null;
};

// Tight prompt — Claude Haiku follows structured-extraction instructions reliably with this version.
const SYSTEM_PROMPT = `Extract invoice fields from the PDF. Return only this JSON, no prose, no code fences:
{"vendor_name":string|null,"vendor_email":string|null,"invoice_number":string|null,"issue_date":"YYYY-MM-DD"|null,"due_date":"YYYY-MM-DD"|null,"po_number":string|null,"project_ref":string|null,"subtotal":number|null,"tax":number|null,"total":number|null,"currency":string|null,"line_items":[{"description":string,"quantity":number|null,"unit_price":number|null,"amount":number|null,"project_ref":string|null}],"raw_text_snippet":string|null}
Rules: null for missing fields, never invent. project_ref = any job number, project, customer reference, property/unit/work order id (critical for construction/HVAC). Money as plain numbers. Dates as YYYY-MM-DD.`;

export async function extractInvoiceFromPdf(pdfBase64: string): Promise<ExtractedInvoice> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not configured.");
  // Default to Haiku 4.5 — 2-3x faster than Opus, plenty capable for structured extraction.
  // Override per-deployment via ANTHROPIC_MODEL if you want Sonnet/Opus accuracy.
  const model = process.env.ANTHROPIC_MODEL ?? "claude-haiku-4-5";

  const client = new Anthropic({ apiKey });

  const message = await client.messages.create({
    model,
    // Real invoices rarely need >1200 tokens of JSON. Shorter cap = faster decode.
    max_tokens: 1500,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "document",
            source: { type: "base64", media_type: "application/pdf", data: pdfBase64 },
          },
          { type: "text", text: "Extract fields. JSON only." },
        ],
      },
    ],
  });

  const textBlock = message.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") throw new Error("Claude returned no text content.");
  const raw = textBlock.text.trim();
  // Strip code fences if Claude added any despite the instruction.
  const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  try {
    return JSON.parse(cleaned) as ExtractedInvoice;
  } catch (e) {
    throw new Error(`Failed to parse Claude response as JSON: ${(e as Error).message}. Raw: ${raw.slice(0, 200)}`);
  }
}
