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

const SYSTEM_PROMPT = `You extract structured invoice data from PDFs and images.
You will be given an invoice document. Return a single JSON object with these fields:
{
  "vendor_name": string or null,
  "vendor_email": string or null,
  "invoice_number": string or null,
  "issue_date": "YYYY-MM-DD" or null,
  "due_date": "YYYY-MM-DD" or null,
  "po_number": string or null,
  "project_ref": string or null,
  "subtotal": number or null,
  "tax": number or null,
  "total": number or null,
  "currency": ISO 4217 code or null,
  "line_items": [{ "description": string, "quantity": number or null, "unit_price": number or null, "amount": number or null, "project_ref": string or null }],
  "raw_text_snippet": short string summarizing the document or null
}

Rules:
- Output JSON only. No prose, no code fences, no commentary.
- Use null for fields you cannot find. Do NOT invent values.
- "project_ref" should capture any job number, project name, customer reference, property address, unit number, or work order id mentioned. Construction/HVAC/trades invoices often include this.
- Money values are plain numbers without currency symbols. Use the currency field for the unit.
- Trim whitespace and normalize dates to YYYY-MM-DD.`;

export async function extractInvoiceFromPdf(pdfBase64: string): Promise<ExtractedInvoice> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not configured.");
  const model = process.env.ANTHROPIC_MODEL ?? "claude-opus-4-7";

  const client = new Anthropic({ apiKey });

  const message = await client.messages.create({
    model,
    max_tokens: 2048,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "document",
            source: { type: "base64", media_type: "application/pdf", data: pdfBase64 },
          },
          { type: "text", text: "Extract the invoice fields. JSON only." },
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
