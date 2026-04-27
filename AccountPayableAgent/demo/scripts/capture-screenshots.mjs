// Capture screenshots of every key screen in the app for documentation.
// Run with the dev server already up on http://localhost:4380.
//
//   node scripts/capture-screenshots.mjs
//
// Output: ../../docs/screenshots/*.png at the repo root.

import { mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, "..", "..", "..", "docs", "screenshots");
const BASE = process.env.PP_BASE ?? "http://localhost:4380";

const SHOTS = [
  { slug: "01-landing", url: "/", title: "Landing page" },
  { slug: "02-app-dashboard", url: "/app", title: "Workspace · Dashboard (before connecting)" },
  { slug: "03-app-inbox", url: "/app", title: "Workspace · Inbox", click: { sidebarLabel: "Inbox" } },
  { slug: "04-app-bills", url: "/app", title: "Workspace · Bills to post", click: { sidebarLabel: "Bills to post" } },
  { slug: "05-app-vendors", url: "/app", title: "Workspace · Vendors", click: { sidebarLabel: "Vendors" } },
  { slug: "06-app-projects", url: "/app", title: "Workspace · Projects", click: { sidebarLabel: "Projects" } },
  { slug: "07-settings", url: "/settings", title: "Settings · Integrations + Automation" },
  { slug: "08-demo-shell", url: "/demo", title: "Guided demo (Greenfield PM)" },
  { slug: "09-mail", url: "/mail", title: "Vendor mail simulator" },
];

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await puppeteer.launch({
    headless: "new",
    defaultViewport: { width: 1440, height: 900, deviceScaleFactor: 2 },
  });
  try {
    const page = await browser.newPage();
    page.setDefaultTimeout(15000);

    for (const shot of SHOTS) {
      const url = `${BASE}${shot.url}`;
      process.stdout.write(`→ ${shot.slug}: ${url} … `);
      try {
        await page.goto(url, { waitUntil: "networkidle2", timeout: 20000 });
      } catch {
        // retry once with a softer wait
        await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20000 });
      }

      // Per-shot click hooks (for in-app sidebar navigation).
      if (shot.click?.sidebarLabel) {
        try {
          await page.evaluate((label) => {
            const btns = Array.from(document.querySelectorAll("button"));
            const target = btns.find((b) => b.textContent?.trim().startsWith(label));
            target?.click();
          }, shot.click.sidebarLabel);
          await new Promise((r) => setTimeout(r, 800));
        } catch {
          /* best effort */
        }
      }

      // Settle final renders / async fetches before snapping.
      await new Promise((r) => setTimeout(r, 1200));

      const out = join(OUT, `${shot.slug}.png`);
      await page.screenshot({ path: out, fullPage: true });
      console.log(`saved ${out}`);
    }
  } finally {
    await browser.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
