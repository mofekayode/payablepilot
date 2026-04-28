// Generate a varied batch of test invoices that exercise every flow
// PayablePilot supports. Saves PDFs into:
//   - public/  (so /test-invoice-*.pdf is served by the dev server)
//   - docs/    (so the user can email any of them as attachments)
//
//   node scripts/generate-test-suite.mjs

import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { mkdir, writeFile } from "node:fs/promises";
import puppeteer from "puppeteer";

const HERE = dirname(fileURLToPath(import.meta.url));
const PUBLIC = join(HERE, "..", "public");
const DOCS = join(HERE, "..", "..", "..", "docs");

function buildHtml(t) {
  const subtotal = t.lines.reduce((s, l) => s + l.quantity * l.unitPrice, 0);
  const taxRate = t.taxRate ?? 0;
  const tax = +(subtotal * taxRate).toFixed(2);
  const total = +(subtotal + tax).toFixed(2);
  const fmt = (n) => n.toLocaleString("en-US", { style: "currency", currency: "USD" });

  return `<!doctype html>
<html><head><meta charset="utf-8" /><title>${t.vendorName} · ${t.invoiceNumber}</title>
<style>
  @page { size: Letter; margin: 0.6in; }
  body { font-family: -apple-system, system-ui, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #1f2937; font-size: 11.5px; line-height: 1.45; }
  .top { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid ${t.brandColor}; padding-bottom: 14px; margin-bottom: 18px; }
  .brand { font-size: 22px; font-weight: 700; color: ${t.brandColor}; letter-spacing: -0.5px; }
  .brand-sub { color: #6b7280; font-size: 11px; margin-top: 2px; }
  .meta { text-align: right; }
  .meta .label { color: #6b7280; font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; }
  .meta .val { font-weight: 600; }
  h1 { font-size: 20px; margin: 0 0 4px 0; letter-spacing: -0.3px; }
  .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 18px; }
  .block-title { font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; color: #6b7280; margin-bottom: 4px; }
  .job-banner { background: color-mix(in oklab, ${t.brandColor} 12%, white); border-left: 4px solid ${t.brandColor}; padding: 10px 14px; margin-bottom: 18px; }
  .job-banner .label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; color: ${t.brandColor}; font-weight: 700; margin-bottom: 2px; }
  .job-banner .val { font-size: 13px; font-weight: 600; color: #134e4a; }
  table { width: 100%; border-collapse: collapse; margin: 8px 0 14px; }
  th { text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; color: #6b7280; border-bottom: 1.5px solid #e5e7eb; padding: 6px 8px; }
  th.num, td.num { text-align: right; }
  td { padding: 8px; border-bottom: 1px solid #f3f4f6; vertical-align: top; }
  td .desc { font-weight: 500; }
  td .ref { color: ${t.brandColor}; font-size: 10.5px; margin-top: 1px; }
  .totals { width: 280px; margin-left: auto; }
  .totals .row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 12px; }
  .totals .row.total { border-top: 2px solid #1f2937; margin-top: 6px; padding-top: 8px; font-weight: 700; font-size: 14px; }
  .terms { margin-top: 22px; color: #4b5563; font-size: 11px; line-height: 1.6; }
  .footer { margin-top: 28px; border-top: 1px solid #e5e7eb; padding-top: 12px; color: #6b7280; font-size: 10px; }
</style></head>
<body>
  <div class="top">
    <div>
      <div class="brand">${t.vendorName}</div>
      <div class="brand-sub">${t.vendorLine1}</div>
      <div class="brand-sub">${t.vendorLine2}</div>
    </div>
    <div class="meta">
      <h1>INVOICE</h1>
      <div><span class="label">Invoice #:</span> <span class="val">${t.invoiceNumber}</span></div>
      <div><span class="label">Issue date:</span> <span class="val">${t.issueDate}</span></div>
      <div><span class="label">Due date:</span> <span class="val">${t.dueDate}</span></div>
      <div><span class="label">Terms:</span> <span class="val">${t.terms}</span></div>
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
      <div><strong>${t.serviceLocation.name}</strong></div>
      <div>${t.serviceLocation.line1}</div>
      <div>${t.serviceLocation.line2}</div>
    </div>
  </div>

  ${
    t.jobBanner
      ? `<div class="job-banner">
           <div class="label">${t.jobBanner.label}</div>
           <div class="val">${t.jobBanner.value}</div>
         </div>`
      : ""
  }

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
      ${t.lines
        .map(
          (l) => `<tr>
            <td>
              <div class="desc">${l.description}</div>
              ${l.jobRef ? `<div class="ref">${l.jobRef}</div>` : ""}
            </td>
            <td class="num">${l.quantity}</td>
            <td class="num">${fmt(l.unitPrice)}</td>
            <td class="num">${fmt(l.quantity * l.unitPrice)}</td>
          </tr>`
        )
        .join("")}
    </tbody>
  </table>

  <div class="totals">
    <div class="row"><span>Subtotal</span><span>${fmt(subtotal)}</span></div>
    ${
      taxRate > 0
        ? `<div class="row"><span>Tax (${(taxRate * 100).toFixed(2)}%, CA)</span><span>${fmt(tax)}</span></div>`
        : ""
    }
    <div class="row total"><span>Total due</span><span>${fmt(total)}</span></div>
  </div>

  <div class="terms">
    <strong>Payment terms.</strong> ${t.terms} from invoice date. Late payments accrue 1.5% / month.
    Make checks payable to <em>${t.vendorName}</em>.
  </div>

  <div class="footer">
    Thank you for your business — ${t.vendorName}
  </div>
</body></html>`;
}

const TEMPLATES = [
  {
    slug: "hvac-emergency",
    scenarioLabel:
      "HVAC emergency repair — exercise full auto-coding (vendor + project + Repairs & Maintenance)",
    vendorName: "Cornerstone HVAC Services",
    vendorLine1: "Heating · Cooling · Refrigeration · Lic #HVA-4419-CA",
    vendorLine2: "2218 Industrial Way, Concord, CA 94520 · (925) 555-0148 · billing@cornerstonehvac.com",
    brandColor: "#0f766e",
    invoiceNumber: "CHV-6128",
    issueDate: "2026-04-25",
    dueDate: "2026-05-25",
    terms: "Net 30",
    serviceLocation: { name: "418 Maple Apartments", line1: "418 Maple St, Unit 4B", line2: "Oakland, CA 94609" },
    jobBanner: {
      label: "Job / Project",
      value: "Job #JOB-2026-0418 · 418 Maple HVAC Spring Tune-Up · emergency thermostat repair",
    },
    lines: [
      {
        description: "Emergency service call — thermostat replacement (Honeywell T6 Pro)",
        jobRef: "418 Maple HVAC Spring Tune-Up · Job #JOB-2026-0418",
        quantity: 1,
        unitPrice: 245.0,
      },
      {
        description: "Wiring repair, low-voltage transformer",
        jobRef: "418 Maple HVAC Spring Tune-Up · Job #JOB-2026-0418",
        quantity: 1,
        unitPrice: 95.0,
      },
      {
        description: "Labor — service hours @ $128.00/hr",
        jobRef: "418 Maple HVAC Spring Tune-Up · Job #JOB-2026-0418",
        quantity: 2,
        unitPrice: 128.0,
      },
    ],
    taxRate: 0.0875,
  },
  {
    slug: "painting-115pine",
    scenarioLabel:
      "Painting work at 115 Pine — different vendor + different project (auto-match should still hit both)",
    vendorName: "BrightBuild Painting",
    vendorLine1: "Interior · Exterior · Lic #PAINT-2841-CA",
    vendorLine2: "401 Carpenter Ave, Berkeley, CA 94710 · (510) 555-0292 · ar@brightbuildpaint.com",
    brandColor: "#a855f7",
    invoiceNumber: "BB-2024-318",
    issueDate: "2026-04-23",
    dueDate: "2026-05-08",
    terms: "Net 15",
    serviceLocation: { name: "115 Pine Tower", line1: "115 Pine St, lobby + corridors", line2: "Oakland, CA 94612" },
    jobBanner: { label: "Project", value: "115 Pine Painting Refresh · lobby & corridor repaint, 3 floors" },
    lines: [
      {
        description: "Lobby walls — 2 coats premium latex (Sherwin-Williams Emerald)",
        jobRef: "115 Pine Painting Refresh",
        quantity: 1,
        unitPrice: 1820.0,
      },
      { description: "Corridor walls floors 1–3 — 2 coats", jobRef: "115 Pine Painting Refresh", quantity: 3, unitPrice: 920.0 },
      { description: "Trim & doors — semi-gloss enamel", jobRef: "115 Pine Painting Refresh", quantity: 1, unitPrice: 540.0 },
      { description: "Materials (paint, primer, supplies)", jobRef: "115 Pine Painting Refresh", quantity: 1, unitPrice: 612.45 },
    ],
    taxRate: 0.0875,
  },
  {
    slug: "landscaping-22oak",
    scenarioLabel: "Monthly landscaping at 22 Oak — third vendor + third project, light service",
    vendorName: "Reliable Landscaping Co.",
    vendorLine1: "Grounds · Irrigation · Tree care · Lic #LANDS-1187-CA",
    vendorLine2: "8 Foothill Way, Oakland, CA 94605 · (510) 555-0440 · accounts@reliablelandscaping.com",
    brandColor: "#16a34a",
    invoiceNumber: "RL-2026-0428",
    issueDate: "2026-04-28",
    dueDate: "2026-05-28",
    terms: "Net 30",
    serviceLocation: {
      name: "22 Oak Street Apartments",
      line1: "22 Oak St, grounds + courtyards",
      line2: "Oakland, CA 94612",
    },
    jobBanner: { label: "Project", value: "22 Oak Street Renovation · April grounds maintenance" },
    lines: [
      { description: "Weekly mow & edge — April (4 visits)", jobRef: "22 Oak Street Renovation", quantity: 4, unitPrice: 220.0 },
      {
        description: "Spring mulching — courtyard + parking strips (3 yards)",
        jobRef: "22 Oak Street Renovation",
        quantity: 3,
        unitPrice: 95.0,
      },
      {
        description: "Irrigation system tune-up (timer programming + leak check)",
        jobRef: "22 Oak Street Renovation",
        quantity: 1,
        unitPrice: 180.0,
      },
    ],
    taxRate: 0.0875,
  },
  {
    slug: "office-supplies-staples",
    scenarioLabel:
      "Office supplies — vendor NOT in QBO seed (Staples Business). Tests fallback when auto-vendor-match misses",
    vendorName: "Staples Business Advantage",
    vendorLine1: "Office supplies · Tech · Furniture",
    vendorLine2: "500 Staples Drive, Framingham, MA 01702 · (855) 555-1188 · ap@staplesadvantage.com",
    brandColor: "#dc2626",
    invoiceNumber: "STA-7741-2026",
    issueDate: "2026-04-26",
    dueDate: "2026-05-26",
    terms: "Net 30",
    serviceLocation: { name: "Greenfield PM Office", line1: "418 Maple St, Suite 200", line2: "Oakland, CA 94609" },
    lines: [
      { description: "Copy paper, 20 lb, white (10 reams)", quantity: 10, unitPrice: 6.49 },
      { description: "HP 414X high-yield toner, black", quantity: 2, unitPrice: 169.0 },
      { description: "Letter-size manila file folders, box of 100", quantity: 3, unitPrice: 28.5 },
      { description: "Sticky notes, multi-color, 24-pack", quantity: 1, unitPrice: 18.99 },
    ],
    taxRate: 0.0625,
  },
  {
    slug: "rental-scissor-lift",
    scenarioLabel: "Equipment rental — Sunbelt Rentals at 22 Oak (rental + supplies keywords)",
    vendorName: "Sunbelt Equipment Rentals",
    vendorLine1: "Construction equipment rental · 24/7 service",
    vendorLine2: "1 Sunbelt Way, Oakland, CA 94621 · (510) 555-0911 · billing@sunbeltrentals.com",
    brandColor: "#ea580c",
    invoiceNumber: "SR-202604-1158",
    issueDate: "2026-04-24",
    dueDate: "2026-05-24",
    terms: "Net 30",
    serviceLocation: { name: "22 Oak Street", line1: "22 Oak St, exterior facade", line2: "Oakland, CA 94612" },
    jobBanner: { label: "Project", value: "22 Oak Street Renovation · facade inspection week" },
    lines: [
      {
        description: "Scissor lift rental — 26ft, electric (3 days)",
        jobRef: "22 Oak Street Renovation",
        quantity: 3,
        unitPrice: 215.0,
      },
      { description: "Delivery & pickup — Oakland zone", quantity: 1, unitPrice: 95.0 },
      { description: "Damage waiver", quantity: 1, unitPrice: 35.0 },
    ],
    taxRate: 0.0875,
  },
  {
    slug: "hvac-duplicate-of-1",
    scenarioLabel:
      "DUPLICATE TEST — same vendor + same invoice number as #1 (CHV-6128). Should flag immediately when sent alongside.",
    vendorName: "Cornerstone HVAC Services",
    vendorLine1: "Heating · Cooling · Refrigeration · Lic #HVA-4419-CA",
    vendorLine2: "2218 Industrial Way, Concord, CA 94520 · (925) 555-0148 · billing@cornerstonehvac.com",
    brandColor: "#0f766e",
    invoiceNumber: "CHV-6128",
    issueDate: "2026-04-25",
    dueDate: "2026-05-25",
    terms: "Net 30",
    serviceLocation: { name: "418 Maple Apartments", line1: "418 Maple St, Unit 4B", line2: "Oakland, CA 94609" },
    jobBanner: { label: "Job / Project", value: "Job #JOB-2026-0418 · 418 Maple HVAC Spring Tune-Up" },
    lines: [
      {
        description: "Emergency service call — thermostat replacement (Honeywell T6 Pro)",
        jobRef: "418 Maple HVAC Spring Tune-Up · Job #JOB-2026-0418",
        quantity: 1,
        unitPrice: 245.0,
      },
      {
        description: "Wiring repair, low-voltage transformer",
        jobRef: "418 Maple HVAC Spring Tune-Up · Job #JOB-2026-0418",
        quantity: 1,
        unitPrice: 95.0,
      },
      {
        description: "Labor — service hours @ $128.00/hr",
        jobRef: "418 Maple HVAC Spring Tune-Up · Job #JOB-2026-0418",
        quantity: 2,
        unitPrice: 128.0,
      },
    ],
    taxRate: 0.0875,
  },
  {
    slug: "hvac-unknown-project",
    scenarioLabel:
      "HVAC at 999 Cypress (project NOT seeded). Vendor + account auto-match, project picker stays empty.",
    vendorName: "Cornerstone HVAC Services",
    vendorLine1: "Heating · Cooling · Refrigeration · Lic #HVA-4419-CA",
    vendorLine2: "2218 Industrial Way, Concord, CA 94520 · (925) 555-0148 · billing@cornerstonehvac.com",
    brandColor: "#0f766e",
    invoiceNumber: "CHV-6244",
    issueDate: "2026-04-27",
    dueDate: "2026-05-27",
    terms: "Net 30",
    serviceLocation: { name: "999 Cypress Court", line1: "999 Cypress Ct", line2: "Oakland, CA 94619" },
    jobBanner: { label: "Job / Project", value: "Job #JOB-2026-0999 · 999 Cypress HVAC install (new project)" },
    lines: [
      {
        description: "New mini-split installation — Mitsubishi MSZ-FH18NA",
        jobRef: "999 Cypress HVAC install",
        quantity: 1,
        unitPrice: 2400.0,
      },
      { description: "Labor — install hours @ $128.00/hr", jobRef: "999 Cypress HVAC install", quantity: 6, unitPrice: 128.0 },
    ],
    taxRate: 0.0875,
  },
];

async function main() {
  await mkdir(PUBLIC, { recursive: true });
  await mkdir(DOCS, { recursive: true });

  const browser = await puppeteer.launch({ headless: "new" });
  const summary = [];
  try {
    const page = await browser.newPage();
    for (const t of TEMPLATES) {
      const filename = `test-invoice-${t.slug}.pdf`;
      await page.setContent(buildHtml(t), { waitUntil: "domcontentloaded" });
      const buffer = await page.pdf({ format: "Letter", printBackground: true });
      await writeFile(join(PUBLIC, filename), buffer);
      await writeFile(join(DOCS, filename), buffer);
      summary.push({ filename, scenario: t.scenarioLabel });
      console.log(`  ✓ ${filename}`);
    }
  } finally {
    await browser.close();
  }

  const index =
    `# Test invoice suite\n\nGenerate again: \`node scripts/generate-test-suite.mjs\`\n\n` +
    summary.map((s) => `- **${s.filename}** — ${s.scenario}`).join("\n") +
    "\n";
  await writeFile(join(DOCS, "TEST-INVOICES.md"), index);
  console.log(`  ✓ docs/TEST-INVOICES.md`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
