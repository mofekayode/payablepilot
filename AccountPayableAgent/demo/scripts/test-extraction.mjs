// End-to-end test for the Claude extraction pipeline.
//
// Reads .env.local, sends the bundled HVAC test invoice (public/test-invoice-hvac.pdf)
// to Claude exactly the way /api/extract/invoice does, and asserts that the
// extracted JSON has the fields PayablePilot needs downstream.
//
//   node scripts/test-extraction.mjs

import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import Anthropic from "@anthropic-ai/sdk";

const HERE = dirname(fileURLToPath(import.meta.url));
const PDF_PATH = join(HERE, "..", "public", "test-invoice-hvac.pdf");
const ENV_PATH = join(HERE, "..", ".env.local");

async function loadEnv() {
  // Tiny .env parser — just enough for our keys, no quoting/expansion games.
  const raw = await readFile(ENV_PATH, "utf-8").catch(() => "");
  const out = {};
  for (const line of raw.split("\n")) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m) out[m[1]] = m[2].trim();
  }
  return out;
}

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
Output JSON only. Use null for fields you cannot find. Money values plain numbers without currency symbols.
"project_ref" should capture any job number, project name, customer reference, property address, unit number, or work
order id mentioned. Trim whitespace and normalize dates to YYYY-MM-DD.`;

function check(label, predicate, actual) {
  const ok = !!predicate;
  const tag = ok ? "✓" : "✗";
  const printed =
    actual === undefined
      ? ""
      : ` → ${typeof actual === "string" ? JSON.stringify(actual) : JSON.stringify(actual)}`;
  console.log(`  ${tag} ${label}${printed}`);
  return ok;
}

async function main() {
  console.log("PayablePilot · extraction test");
  console.log("============================================");

  const env = await loadEnv();
  const apiKey = env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error("✗ ANTHROPIC_API_KEY missing from .env.local");
    process.exit(1);
  }
  const model = env.ANTHROPIC_MODEL || "claude-opus-4-7";
  console.log(`Model: ${model}`);

  const pdf = await readFile(PDF_PATH);
  const base64 = pdf.toString("base64");
  console.log(`PDF: ${PDF_PATH} (${(pdf.length / 1024).toFixed(1)} KB)`);

  const client = new Anthropic({ apiKey });
  const t0 = Date.now();
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
            source: { type: "base64", media_type: "application/pdf", data: base64 },
          },
          { type: "text", text: "Extract the invoice fields. JSON only." },
        ],
      },
    ],
  });
  const elapsed = ((Date.now() - t0) / 1000).toFixed(2);
  console.log(`Claude responded in ${elapsed}s`);

  const textBlock = message.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    console.error("✗ Claude returned no text block");
    process.exit(1);
  }
  const cleaned = textBlock.text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  let extracted;
  try {
    extracted = JSON.parse(cleaned);
  } catch (e) {
    console.error("✗ Failed to parse JSON:", e.message);
    console.error("Raw response:", cleaned);
    process.exit(1);
  }

  console.log("\nExtracted JSON:");
  console.log(JSON.stringify(extracted, null, 2));

  console.log("\nAssertions:");
  let passed = 0;
  let total = 0;
  const t = (label, pred, val) => {
    total++;
    if (check(label, pred, val)) passed++;
  };

  t("vendor_name contains 'Cornerstone'", /Cornerstone/i.test(extracted.vendor_name ?? ""), extracted.vendor_name);
  t("invoice_number = 'CHV-4821'", extracted.invoice_number === "CHV-4821", extracted.invoice_number);
  t("issue_date = '2026-04-22'", extracted.issue_date === "2026-04-22", extracted.issue_date);
  t("due_date = '2026-05-22'", extracted.due_date === "2026-05-22", extracted.due_date);
  t("project_ref mentions 'JOB-2026-0418'", /JOB-2026-0418/.test(extracted.project_ref ?? ""), extracted.project_ref);
  t("currency = USD", (extracted.currency ?? "").toUpperCase() === "USD", extracted.currency);
  t("subtotal = 1130", extracted.subtotal === 1130 || extracted.subtotal === 1130.0, extracted.subtotal);
  t("total = 1228.88", Math.abs((extracted.total ?? 0) - 1228.88) < 0.01, extracted.total);
  t("≥ 4 line items", Array.isArray(extracted.line_items) && extracted.line_items.length >= 4, extracted.line_items?.length);
  t(
    "≥ one line carries job ref",
    Array.isArray(extracted.line_items) && extracted.line_items.some((li) => /JOB/.test(li.project_ref ?? "")),
    extracted.line_items?.find((li) => li.project_ref)?.project_ref
  );

  console.log(`\n${passed}/${total} assertions passed`);
  process.exit(passed === total ? 0 : 1);
}

main().catch((e) => {
  console.error("✗ test crashed:", e.message);
  process.exit(1);
});
