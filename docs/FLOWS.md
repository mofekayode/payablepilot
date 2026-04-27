# PayablePilot · Flows Reference

This document walks through every meaningful screen in PayablePilot, what flow each one supports, and what the bookkeeper actually does on it. Screenshots live in `docs/screenshots/` and are referenced inline.

## Big picture

PayablePilot is an AP-automation product for SMB bookkeepers (initial design partner: Wyatt's HVAC client, ~80 invoices/month, currently using QuickBooks Online + Dext). It does five things end-to-end:

1. **Ingest** invoices from a connected Gmail mailbox or via manual upload.
2. **Extract** vendor, dates, amounts, line items, and project / job references using Claude vision.
3. **Match** the extracted invoice to a QuickBooks vendor, project, and expense account.
4. **Post** the bill into QuickBooks Online for the bookkeeper's release.
5. **Stay quiet** — payments themselves are never initiated by PayablePilot. The bookkeeper releases payment from inside QuickBooks.

The application has two surfaces sharing one Next.js codebase:

- **`/app`** — the lean, real-product workspace. No mocked data. Every view is driven by the user's connected Gmail and QuickBooks Online accounts.
- **`/demo`** — a polished narrative tour using a fictional property-management portfolio (Greenfield PM). Used purely for sales pitches; it doesn't reflect what a real user sees once they sign in.

Supporting routes:

- **`/`** — public landing page.
- **`/settings`** — connect Gmail, connect QuickBooks Online, configure automation toggles and workflow style.
- **`/mail`** — vendor-side Gmail simulator used inside the guided demo (composing the invoice that the agent processes).
- **`/tour`** — demo entry point; routes into `/demo`.

OAuth tokens live in HTTP-only cookies for now; production will replace this with a database keyed by user/workspace.

---

## 01 — Landing page

![Landing](./screenshots/01-landing.png)

**Route:** `/`

**Purpose:** marketing surface. The hero pitch ("AP under control. Without adding headcount."), a Loom embed, integrations strip mentioning **only QuickBooks Online and Xero**, the features grid, and the Calendly CTA ("Book a 15-minute walkthrough" → `https://calendly.com/mofekayode/15min`).

**Notable:**
- Earlier copy mentioned Sage / NetSuite / generic "books" — those have been removed in line with Wyatt's feedback that integrations on the page should match the integrations we'll actually ship.
- "Drive the live product" CTA links to `/demo` (guided narrative). The real workspace is at `/app` for users who already have credentials.

---

## 02 — Workspace dashboard (Day 1 / not connected yet)

![Dashboard](./screenshots/02-app-dashboard.png)

**Route:** `/app` (default view: Dashboard)

**Purpose:** the entry screen for a real user. Probes Gmail and QuickBooks connection state on mount and prompts the user to finish setup.

**What's on this screen:**
- Headline: "Almost ready — connect your accounts to start." (Switches to "You're connected. Let's process some bills." once both integrations are live.)
- Amber connection banner with a direct **Open settings** CTA when either integration is missing.
- Four stat cards (Extracted today / Bills ready to post / Posted to QuickBooks / Errors), all zero on Day 1.
- Three action cards: open the live Inbox, open the Bills queue, browse Projects & Vendors. Each card disables itself with a clear hint when its required integration isn't connected.

**Once connected:** stat cards populate from `localStorage`-persisted captured invoices; "Recent activity" feed appears below the action cards showing the last six bills moved through the system.

**Sidebar:** Dashboard / Inbox / Bills to post / Vendors / Projects, plus persistent links to Settings and the guided demo.

**Topbar:** two pill badges — Gmail and QuickBooks — green/checked when connected, amber/alert when not.

---

## 03 — Live Inbox

![Inbox](./screenshots/03-app-inbox.png)

**Route:** `/app` → sidebar **Inbox**

**Purpose:** the heart of the product. Shows attachment-bearing emails from the connected Gmail mailbox in real time and lets the bookkeeper extract any of them with one click.

**What happens on this screen:**
1. On mount, hits `GET /api/integrations/gmail/messages?days=30&max=25`.
2. The endpoint runs Gmail's search query `has:attachment newer_than:30d`, then for each match re-fetches the full message (`format=full`) so attachment filenames are visible.
3. Renders the list in the left pane with sender / subject / snippet / first attachment chip.
4. The right pane shows the selected message with each attachment listed.
5. Clicking **Extract** on a PDF attachment calls `POST /api/extract/invoice` with `{ source: "gmail", messageId, attachmentId }`. The endpoint downloads the attachment via the Gmail API, base64-normalizes it, and sends it to Claude with a strict invoice-schema prompt.
6. The extracted JSON renders inline as an "Extracted by Claude" card: vendor, invoice number, dates, **project / job reference (highlighted in brand color)**, totals, and per-line items including any per-line job refs.
7. Clicking **Send to bills** persists the captured invoice to localStorage via `addCaptured()` and navigates to the Bills queue.

**Disconnected state** (shown in the screenshot): a friendly empty state with a link to `/settings`. No fake messages. The user sees nothing until they connect Gmail.

**Manual upload** sits in the same left-pane header as a small "Upload" button. Clicking it opens a drag-and-drop modal that uploads any PDF directly to Claude (`POST /api/extract/invoice` with `source: "upload"`), and saves the result into the same captured-invoice store.

---

## 04 — Bills to post (review and push to QuickBooks)

![Bills](./screenshots/04-app-bills.png)

**Route:** `/app` → sidebar **Bills to post**

**Purpose:** the review surface. Each captured invoice that came out of the inbox or a manual upload shows up here as a row; the bookkeeper confirms vendor / project / expense account and presses the green "Post bill to QuickBooks" button.

**Per-row controls:**
- **Vendor picker** — searchable list of QBO vendors pulled from `/api/integrations/qbo/vendors`. Auto-suggests a match by fuzzy-comparing the extracted vendor name; required before posting.
- **Project / Job picker** — pulled from `/api/integrations/qbo/projects` (QBO models projects as Customers with `IsProject=true`). Optional; the workflow's "project_ref" hint extracted from the PDF is shown beneath as guidance.
- **Expense account picker** — pulled from `/api/integrations/qbo/accounts`. Filtered to `AccountType = 'Expense'`; required before posting.
- **Extracted line items** preview (collapsed view shows total only).

**Posting flow:**
1. User clicks **Post bill to QuickBooks**.
2. Frontend calls `POST /api/integrations/qbo/bills` with `{ vendorId, txnDate, docNumber, projectId, lines: [{ description, amount, accountId }] }`.
3. The backend hits Intuit's REST API: `POST /v3/company/{realmId}/bill?minorversion=70`. Each line item carries `AccountBasedExpenseLineDetail.AccountRef` and (when present) `CustomerRef` for project costing — that's QBO's project-attribution model.
4. On success, the row's status flips to **Posted**, the QBO bill ID is stored, and the row drops into the "Posted to QuickBooks" section at the bottom of the page with a green check.
5. On failure, the row's status flips to **Error** with the literal Intuit error message inline.

**Empty state** (shown in the screenshot): "Nothing in the queue" with a CTA back to the inbox.

---

## 05 — Vendors (QuickBooks live)

![Vendors](./screenshots/05-app-vendors.png)

**Route:** `/app` → sidebar **Vendors**

**Purpose:** browse the vendor list pulled live from QuickBooks. Used by the bookkeeper for sanity-checking what data we have, and to verify a new vendor showed up after they created it in QBO.

**What happens:** page loads `/api/integrations/qbo/vendors`, which queries `select * from Vendor maxresults 25` against Intuit's REST API. Each row shows display name, primary email + phone, 1099 flag, and any open balance. The search box filters client-side.

**Disconnected state** (shown): friendly amber prompt to connect QuickBooks via Settings.

---

## 06 — Projects (QuickBooks live)

![Projects](./screenshots/06-app-projects.png)

**Route:** `/app` → sidebar **Projects**

**Purpose:** show the QBO Projects list. This is the feature Wyatt's HVAC client absolutely needs — without it the product doesn't work for trades.

**What happens:** page loads `/api/integrations/qbo/projects`, which queries `select Id, DisplayName, ParentRef, Active from Customer where IsProject = true and Active = true`. Each card shows the project name and parent customer. If the QBO company doesn't have Projects enabled, the page shows a clear empty state with the exact navigation path inside QuickBooks to turn it on (Settings → Account and Settings → Advanced → Projects).

**How it ties together:** when posting a bill, the project-picker on the bills queue is the same data shown here.

---

## 07 — Settings (Integrations + Automation + Workflow style)

![Settings](./screenshots/07-settings.png)

**Route:** `/settings`

**Purpose:** all configuration lives here.

**Sections (top to bottom):**

1. **Integrations** — two cards:
   - **Gmail** with **Connect** button → starts the Google OAuth flow at `/api/integrations/gmail/auth`. Read-only `gmail.readonly` scope.
   - **QuickBooks Online** with **Connect** → starts Intuit OAuth at `/api/integrations/qbo/auth`. `com.intuit.quickbooks.accounting` scope, sandbox by default (env `QBO_ENV=sandbox`).
   Each card shows the required env vars and a link to the developer console for that platform.

2. **Workflow style** (per Wyatt's feedback) — three-card picker:
   - **Strict** — POs required, full 3-way match. For property managers / formal procurement.
   - **Standard** *(default)* — POs optional. Match if a PO exists, otherwise post directly. Best fit for most SMBs.
   - **Bills only** — no matching at all. Captured invoices flow straight to "ready to post." Best for HVAC / contractors / service businesses without formal procurement.

3. **Automation toggles** — grouped by intent:
   - *When invoices arrive*: extract fields, match POs, block duplicates (all default on, marked "Safe to keep on").
   - *When something needs follow-up*: auto-reply on discrepancies (default off), chase receipts, chase W-9s, overdue reminders, statement reconciliation.
   - *When ready to post*: auto-post matched bills (default off, flagged "Skips your approval" so it's clear).
   - *Notifications*: daily digest, discrepancy pings, digest delivery time picker.

   Settings persist in localStorage; "Reset to defaults" button resets the entire automation block.

**Why this matters for Wednesday:** Wyatt picks "Bills only" for his HVAC client → the workspace skips matching → invoices flow inbox → extract → vendor/project/account picker → post. No friction from process he doesn't follow.

---

## 08 — Guided demo (Greenfield PM narrative)

![Demo](./screenshots/08-demo-shell.png)

**Route:** `/demo`

**Purpose:** sales pitch. A polished, fully scripted experience using a fictional property-management portfolio (Greenfield PM, Erin Boyd, Summit Plumbing, Reliable Landscaping, etc.) where every screen demonstrates the agent's narrative without requiring real connections.

**Sidebar groups:** Overview (Daily digest, Agent outbox), Inbox & queue (Inbox, Captured queue, Discrepancies, Bills to post), Reports (AP aging, Vendor statements, Month-end close), Compliance (W-9 / 1099, Expense reports, Card reconciliation, Vendors).

**Why we keep this:** the narrative around Greenfield is what makes the agent's *vision* easy to grasp in a 15-minute call. Wyatt sees "morning digest → flagged discrepancy → vendor email auto-drafted → batch posted to QuickBooks" without anything having to be set up. After seeing the storytelling, he switches to `/app` to see his real account.

**Notable:** several views inside `/demo` — Aging, Compliance, Statements, Cards, Expenses — exist only because they fill out the narrative. None of them are wired into `/app` yet; once paying users have real data those tabs will graduate.

---

## 09 — Vendor mail simulator

![Mail](./screenshots/09-mail.png)

**Route:** `/mail`

**Purpose:** part of the guided demo. A fake Gmail UI styled to match real Gmail, with three accounts in the top-right account switcher:
- **Summit Plumbing Billing** (the vendor) — drafts an invoice email with PDF attachment, hits Send → triggers the demo cascade.
- **Reliable Landscaping** (the vendor) — same, but with a $160 pricing discrepancy that the agent will flag.
- **Erin Boyd · Greenfield PM** — the bookkeeper's view, with the agent's morning digest, discrepancy alerts, and statement reconciliation emails styled in the PayablePilot brand template.
- **AP Inbox · Greenfield PM** — the catch-all `ap@greenfieldpm.com` inbox showing what a property manager actually receives in a morning (mostly invoice noise) — there to underscore the volume problem.

**How it ties to `/demo`:** when a vendor account hits Send, a demo channel event fires; the corresponding invoice transitions through the matching pipeline inside `/demo`, and PayablePilot's reply email lands in Erin's inbox a few seconds later.

This route doesn't need any auth — it's purely scripted.

---

## End-to-end happy path (the demo Wyatt sees on Wednesday)

1. **Open `/demo`** — quick narrative tour to anchor the vision: a morning digest, a flagged discrepancy, a clean batch posting.
2. **Switch to `/settings`** — both integrations connected, Workflow style set to **Bills only** (because his HVAC client doesn't run POs).
3. **Open `/app` → Inbox** — Wyatt's actual `mofekayode@gmail.com` (or his client's) appears with real attachment-bearing threads from the last 30 days.
4. **Click Extract on a real invoice** (e.g., Anthropic / Supabase / Stripe / a forwarded HVAC invoice) — Claude returns vendor / invoice number / line items / project ref. Render time is 4–8 seconds.
5. **Send to bills** — captured invoice appears in the Bills queue with the extracted vendor pre-matched against QBO and the project-ref ready to be assigned.
6. **Pick project + expense account → Post bill to QuickBooks** — `/v3/.../bill` API call succeeds; the row turns green with the QBO bill ID; bookkeeper opens QBO and sees the bill ready for payment release.

This is the real loop. Everything from step 3 onward is live — no mocks.

---

## What's mocked vs. real

| Layer | State |
| --- | --- |
| Landing page | Static marketing copy |
| `/demo/*` | Fully mocked Greenfield narrative (intentional) |
| `/mail` | Scripted vendor-to-Erin email cascade (intentional) |
| OAuth (Gmail + QBO) | **Real** — production Google + Intuit consent screens |
| Gmail message list | **Real** — `gmail.users.messages.list` |
| Gmail attachment download | **Real** — `gmail.users.messages.attachments.get` |
| PDF extraction | **Real** — Claude vision API via Anthropic SDK |
| QBO Vendors / Projects / Accounts | **Real** — QBO REST `/v3/.../query` |
| Posting bills to QBO | **Real** — QBO REST `POST /v3/.../bill` |
| Captured-invoice persistence | localStorage (production swap target: Postgres) |
| Token storage | HTTP-only cookies (production swap target: encrypted DB rows) |
| User accounts / multi-tenancy | Single-browser-session for now |
| Background sync / webhook | None yet — frontend-triggered fetches only |

---

## Known gaps to close after Wednesday

- **Forwarding-email intake** (`ap+client123@payablepilot.com`) — Wyatt asked for it; not blocking the first demo.
- **Background Gmail sync** — currently the inbox only updates when the user opens it. Vercel Cron + a queue worker will handle this.
- **Multi-tenant data model** — workspaces per client, multiple Gmail mailboxes per workspace. Roughly 3 days of work once a paying customer materializes.
- **Bill duplicate detection on real data** — currently an in-memory check inside the demo. Easy to extend by querying QBO for `Bill where DocNumber = ?` before posting.
- **OCR accuracy verification** — the Extracted card today shows what Claude returned with no confidence indicators. Adding "low confidence" highlights for sparse fields is a small follow-up.

---

## Re-running the screenshots

```bash
cd AccountPayableAgent/demo
npm run dev    # in another terminal
node scripts/capture-screenshots.mjs
```

Output lands in `docs/screenshots/`. The script captures unauthenticated state by default; sign in to localhost:4380 from the same browser if you want to capture connected screens too (out of scope for Puppeteer's default fresh profile).
