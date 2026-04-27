// Generate a realistic HVAC invoice PDF used by the in-app diagnostics flow
// and as a "send this to yourself" test artifact for the Gmail path.
//
//   node scripts/generate-test-invoice.mjs

import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { mkdir } from "node:fs/promises";
import puppeteer from "puppeteer";

const HERE = dirname(fileURLToPath(import.meta.url));
const PUBLIC = join(HERE, "..", "public");
const DOCS = join(HERE, "..", "..", "..", "docs");

const HTML = `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>Cornerstone HVAC Services · Invoice CHV-4821</title>
<style>
  @page { size: Letter; margin: 0.6in; }
  body { font-family: -apple-system, system-ui, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #1f2937; font-size: 11.5px; line-height: 1.45; }
  .top { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #0f766e; padding-bottom: 14px; margin-bottom: 18px; }
  .brand { font-size: 22px; font-weight: 700; color: #0f766e; letter-spacing: -0.5px; }
  .brand-sub { color: #6b7280; font-size: 11px; margin-top: 2px; }
  .meta { text-align: right; }
  .meta .label { color: #6b7280; font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; }
  .meta .val { font-weight: 600; }
  h1 { font-size: 20px; margin: 0 0 4px 0; letter-spacing: -0.3px; }
  .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 18px; }
  .block-title { font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; color: #6b7280; margin-bottom: 4px; }
  .job-banner { background: #f0fdfa; border-left: 4px solid #0f766e; padding: 10px 14px; margin-bottom: 18px; }
  .job-banner .label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; color: #0f766e; font-weight: 700; margin-bottom: 2px; }
  .job-banner .val { font-size: 13px; font-weight: 600; color: #134e4a; }
  table { width: 100%; border-collapse: collapse; margin: 8px 0 14px; }
  th { text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; color: #6b7280; border-bottom: 1.5px solid #e5e7eb; padding: 6px 8px; }
  th.num, td.num { text-align: right; }
  td { padding: 8px; border-bottom: 1px solid #f3f4f6; vertical-align: top; }
  td .desc { font-weight: 500; }
  td .ref { color: #0f766e; font-size: 10.5px; margin-top: 1px; }
  .totals { width: 280px; margin-left: auto; }
  .totals .row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 12px; }
  .totals .row.total { border-top: 2px solid #1f2937; margin-top: 6px; padding-top: 8px; font-weight: 700; font-size: 14px; }
  .terms { margin-top: 22px; color: #4b5563; font-size: 11px; line-height: 1.6; }
  .footer { margin-top: 28px; border-top: 1px solid #e5e7eb; padding-top: 12px; color: #6b7280; font-size: 10px; }
</style>
</head>
<body>
  <div class="top">
    <div>
      <div class="brand">Cornerstone HVAC Services</div>
      <div class="brand-sub">Heating · Cooling · Refrigeration · Lic #HVA-4419-CA</div>
      <div class="brand-sub">2218 Industrial Way, Concord, CA 94520 · (925) 555-0148 · billing@cornerstonehvac.com</div>
    </div>
    <div class="meta">
      <h1>INVOICE</h1>
      <div><span class="label">Invoice #:</span> <span class="val">CHV-4821</span></div>
      <div><span class="label">Issue date:</span> <span class="val">2026-04-22</span></div>
      <div><span class="label">Due date:</span> <span class="val">2026-05-22</span></div>
      <div><span class="label">Terms:</span> <span class="val">Net 30</span></div>
    </div>
  </div>

  <div class="grid2">
    <div>
      <div class="block-title">Bill to</div>
      <div><strong>Greenfield Property Management</strong></div>
      <div>Attn: Accounts Payable</div>
      <div>418 Maple St, Suite 200</div>
      <div>Oakland, CA 94609</div>
      <div>ap@greenfieldpm.com</div>
    </div>
    <div>
      <div class="block-title">Service location</div>
      <div><strong>Maple Street Apartments</strong></div>
      <div>418 Maple St, Unit 12B</div>
      <div>Oakland, CA 94609</div>
    </div>
  </div>

  <div class="job-banner">
    <div class="label">Job / Project</div>
    <div class="val">Job #JOB-2026-0418 · 418 Maple St HVAC Spring Tune-Up</div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width:55%">Description</th>
        <th class="num" style="width:10%">Qty</th>
        <th class="num" style="width:17%">Unit price</th>
        <th class="num" style="width:18%">Amount</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>
          <div class="desc">Spring tune-up service — Carrier 38AUZA condenser, indoor coil clean</div>
          <div class="ref">Job #JOB-2026-0418</div>
        </td>
        <td class="num">2</td>
        <td class="num">$185.00</td>
        <td class="num">$370.00</td>
      </tr>
      <tr>
        <td>
          <div class="desc">R-410A refrigerant top-off (2 lbs)</div>
          <div class="ref">Job #JOB-2026-0418</div>
        </td>
        <td class="num">2</td>
        <td class="num">$98.50</td>
        <td class="num">$197.00</td>
      </tr>
      <tr>
        <td>
          <div class="desc">Filter replacement — pleated 16x25x4 MERV 13</div>
          <div class="ref">Job #JOB-2026-0418</div>
        </td>
        <td class="num">4</td>
        <td class="num">$28.75</td>
        <td class="num">$115.00</td>
      </tr>
      <tr>
        <td>
          <div class="desc">Labor — service hours @ $128.00/hr</div>
          <div class="ref">Job #JOB-2026-0418</div>
        </td>
        <td class="num">3.5</td>
        <td class="num">$128.00</td>
        <td class="num">$448.00</td>
      </tr>
    </tbody>
  </table>

  <div class="totals">
    <div class="row"><span>Subtotal</span><span>$1,130.00</span></div>
    <div class="row"><span>Tax (8.75%, CA)</span><span>$98.88</span></div>
    <div class="row total"><span>Total due</span><span>$1,228.88</span></div>
  </div>

  <div class="terms">
    <strong>Payment terms.</strong> Net 30 from invoice date. Late payments accrue 1.5% / month after 30 days.
    Make checks payable to <em>Cornerstone HVAC Services</em>. ACH and credit card accepted via the link emailed with this
    invoice.
  </div>

  <div class="footer">
    Thank you for your business — Cornerstone HVAC Services · billing@cornerstonehvac.com · EIN 84-2918471
  </div>
</body>
</html>`;

async function main() {
  await mkdir(PUBLIC, { recursive: true });
  await mkdir(DOCS, { recursive: true });

  const browser = await puppeteer.launch({ headless: "new" });
  try {
    const page = await browser.newPage();
    await page.setContent(HTML, { waitUntil: "domcontentloaded" });
    const buffer = await page.pdf({ format: "Letter", printBackground: true });
    const publicOut = join(PUBLIC, "test-invoice-hvac.pdf");
    const docsOut = join(DOCS, "test-invoice-hvac.pdf");
    await writeFile(publicOut, buffer);
    await writeFile(docsOut, buffer);
    console.log(`Saved ${publicOut}`);
    console.log(`Saved ${docsOut}`);
  } finally {
    await browser.close();
  }
}

import { writeFile } from "node:fs/promises";

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
