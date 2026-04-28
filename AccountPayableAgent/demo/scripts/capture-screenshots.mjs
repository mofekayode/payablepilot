// Capture screenshots of every key screen in the app for documentation.
//
// Default mode (CI / clean): launches a fresh headless browser, captures the
// unauthenticated state. Useful to confirm empty-state copy looks right.
//
// Authed mode: pass --auth to use a persistent profile under .puppeteer-profile/.
// First run opens a visible browser so you can sign in via /settings (Connect
// Gmail + Connect QuickBooks) — close the window when done. Subsequent --auth
// runs reuse that profile and capture the connected views.
//
//   node scripts/capture-screenshots.mjs            # fresh, headless
//   node scripts/capture-screenshots.mjs --auth     # uses saved login
//
// Override target with PP_BASE env var (default http://localhost:4380).

import { mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, "..", "..", "..", "docs", "screenshots");
const PROFILE = join(HERE, "..", ".puppeteer-profile");
const BASE = process.env.PP_BASE ?? "http://localhost:4380";
const AUTH = process.argv.includes("--auth");

const SHOTS = [
  { slug: "01-landing", url: "/", title: "Landing page" },
  { slug: "02-app-dashboard", url: "/app", title: "Workspace · Dashboard (before connecting)" },
  { slug: "03-app-inbox", url: "/app", title: "Workspace · Inbox", click: { sidebarLabel: "Inbox" } },
  { slug: "04-app-bills", url: "/app", title: "Workspace · Bills to post", click: { sidebarLabel: "Bills to post" } },
  { slug: "05-app-vendors", url: "/app", title: "Workspace · Vendors", click: { sidebarLabel: "Vendors" } },
  { slug: "06-app-projects", url: "/app", title: "Workspace · Projects", click: { sidebarLabel: "Projects" } },
  { slug: "07-settings", url: "/settings", title: "Settings · Integrations + Automation" },
  { slug: "08-app-diagnostics", url: "/app/diagnostics", title: "Workspace · Diagnostics" },
  { slug: "09-demo-shell", url: "/demo", title: "Guided demo (Greenfield PM)" },
  { slug: "10-mail", url: "/mail", title: "Vendor mail simulator" },
];

async function main() {
  await mkdir(OUT, { recursive: true });
  if (AUTH) await mkdir(PROFILE, { recursive: true });

  const browser = await puppeteer.launch({
    // In auth mode, use a saved profile (so cookies persist) and run visibly so
    // a fresh login can be performed interactively. In default mode, headless.
    headless: AUTH ? false : "new",
    userDataDir: AUTH ? PROFILE : undefined,
    defaultViewport: { width: 1440, height: 900, deviceScaleFactor: 2 },
    args: AUTH ? ["--no-first-run", "--no-default-browser-check"] : undefined,
  });
  try {
    const pages = await browser.pages();
    const page = pages[0] ?? (await browser.newPage());
    page.setDefaultTimeout(15000);

    if (AUTH) {
      // First-run / not-yet-signed-in helper: drop the user on /settings so they
      // can connect both integrations, then press Enter in the terminal to start
      // the captures. On subsequent runs, /settings just shows them connected
      // and they can immediately press Enter.
      await page.goto(`${BASE}/settings`, { waitUntil: "domcontentloaded" });
      console.log(
        "Auth mode: a Chromium window is open at /settings. Sign in / confirm both integrations are connected, then come back here and press Enter."
      );
      await new Promise((r) => process.stdin.once("data", r));
    }

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
