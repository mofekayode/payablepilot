# PayablePilot setup

What to provision and where to paste the keys, in order. Estimate: 30–45 min.

## 1. Supabase

1. Create a project at https://supabase.com → New project. Pick the closest region.
2. Once it's up, go to **Project settings → API** and copy:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (keep server-only)
3. Run the schema migrations. In **SQL editor → New query**, paste and run:
   - `supabase/migrations/0001_init.sql`
   - `supabase/migrations/0002_rls.sql`
   (Order matters — the second file references tables defined in the first.)
4. Enable auth providers under **Authentication → Providers**:
   - **Email**: on. Toggle "Confirm email" off for development; on for production.
   - **Google**: on. You'll need a Google OAuth client (next step) — paste the
     client ID + secret from Google Cloud here.
5. Under **Authentication → URL Configuration**, set:
   - Site URL: `http://localhost:4380` (dev) or `https://app.payablepilot.com` (prod)
   - Redirect URLs: add both `http://localhost:4380/auth/callback` and your production URL.

## 2. Google Cloud (for Sign in with Google AND Gmail OAuth)

You need *one* OAuth client used for both flows.

1. Go to https://console.cloud.google.com → create a project (or reuse one).
2. **APIs & Services → Library → Gmail API → Enable**.
3. **APIs & Services → OAuth consent screen** → External, add your app name and the
   `gmail.readonly` scope.
4. **APIs & Services → Credentials → Create credentials → OAuth client ID → Web application.**
   Authorized redirect URIs:
   - `http://localhost:4380/api/integrations/gmail/callback`
   - `https://<your-supabase-ref>.supabase.co/auth/v1/callback`
   - your production equivalents
5. Copy the client ID and secret into both:
   - `.env.local` → `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
   - Supabase → **Authentication → Providers → Google**

## 3. Intuit Developer (QuickBooks Online)

1. https://developer.intuit.com/app/developer/dashboard → Create an app → Accounting.
2. **Keys & OAuth → Redirect URIs**: add `http://localhost:4380/api/integrations/qbo/callback`
   (and your production equivalent).
3. Copy `Client ID` and `Client Secret` into `.env.local`.
4. Keep `QBO_ENV=sandbox` until you're ready to flip a real client over.

## 4. Anthropic

1. https://console.anthropic.com/settings/keys → create a key → paste into `ANTHROPIC_API_KEY`.

## 5. Postmark (inbound + outbound mail)

This can wait until you actually need to receive forwarded mail. The app works
without it — you just won't get inbound webhooks. For the first client this
week, the bookkeeper can connect the client's Gmail directly and skip Postmark.

When you're ready:

1. Sign up at https://postmarkapp.com.
2. Add a server, then go to **Inbound → Configuration**.
3. Generate a long random string (e.g. `openssl rand -hex 24`). Set both:
   - `.env.local` → `POSTMARK_INBOUND_SECRET=<that string>`
   - In Postmark, set the inbound webhook to:
     `https://app.payablepilot.com/api/inbound/postmark`
     with HTTP basic auth — username can be anything, password is your secret.
4. Postmark gives you an inbound MX. Add to your DNS at `inbound.payablepilot.com`:
   - MX record → Postmark's inbound host (10 priority)
   - SPF / DKIM as Postmark instructs (paste the records)
5. Outbound: copy the **Server token** → `POSTMARK_SERVER_TOKEN`.
6. (Optional, recommended) Get one Google Workspace seat at `support@payablepilot.com`
   for human replies. AP intake stays on Postmark.

## 6. .env.local

Copy `.env.example` → `.env.local` and fill in everything you've collected.

## 7. Run it

```
cd AccountPayableAgent/demo
npm install
npm run dev
```

Open http://localhost:4380, click **Create an account**, and walk through the flow.

## What's where

- `supabase/migrations/` — schema + RLS. Run in order.
- `src/middleware.ts` — gates `/app`, `/settings`, `/onboarding` behind auth.
- `src/lib/supabase/` — server, browser, admin (service-role) clients.
- `src/lib/auth/current.ts` — `getCurrentUser`, `getActiveBusiness`, etc.
- `src/lib/integrations/tokens.ts` — DB-backed OAuth token storage, scoped per business.
- `src/app/onboarding/` — sign-up flow: create business → connect integrations.
- `src/app/api/businesses/` — list / create / switch active business.
- `src/app/api/inbound/postmark/route.ts` — webhook for inbound mail.

## Quick smoke test

After Supabase is up and migrations are run:

```bash
# In a different terminal, watch postgres logs in the Supabase dashboard
# while doing this:
1. Go to /sign-up → create an account → bootstraps a firm
2. Land on /onboarding/business → create your first client business
3. Land on /onboarding/connect → connect Gmail + QBO
4. Land on /app → workspace switcher should show your business in the topbar
5. Go to /settings → check Business Profile + Forwarding Address are populated
6. Click "Add a business" in the switcher → confirm second business shows up
   and switching between them updates the active business cookie.
```

If any step fails, check the Supabase dashboard logs and the Next.js server output —
the auth helpers throw with descriptive messages.

## 8. Gmail ingestion (firm-level + Pub/Sub Push)

The bookkeeper connects ONE Gmail mailbox at the firm level. Inbound messages
are routed to the right business by the worker reading off `processing_jobs`.

### Required: queue + polling crons

These run automatically on Vercel Cron (defined in `vercel.json`):

- `POST /api/queue/run` — every minute. Drains a batch of pending jobs.
- `POST /api/integrations/gmail/poll` — every 5 minutes. Fetches new
  messages from every firm-level Gmail mailbox and enqueues routing.
- `POST /api/integrations/gmail/watch-renew` — every 12h. Renews Gmail
  Push watches before they expire (only useful once Pub/Sub is set up).

To allow Vercel Cron to call them, set on Vercel:

```
CRON_SECRET=<long random string, e.g. openssl rand -hex 32>
```

Vercel will pass `Authorization: Bearer $CRON_SECRET` automatically.

> **Vercel plan note:** minute-frequency crons require Pro plan. Hobby
> plan supports daily crons. If you're on Hobby, lower the cadence in
> `vercel.json` to `0 */1 * * *` (hourly) and accept the latency.

### Optional but recommended: real-time Push notifications

Without Push, the system relies on the 5-minute poller. With Push, Gmail
notifies our webhook the moment a message lands in any connected mailbox
(sub-second latency). Setup is one-time per environment.

#### Step 1 — GCP Pub/Sub topic

In your existing Google Cloud project (the one hosting the Gmail OAuth
client):

1. Enable the Pub/Sub API.
2. **Pub/Sub → Topics → Create Topic** → name it `gmail-push`.
3. **Permissions** on that topic → add member
   `serviceAccount:gmail-api-push@system.gserviceaccount.com` with role
   **Pub/Sub Publisher**. (This is the official Gmail service account that
   publishes notifications.)
4. **Pub/Sub → Subscriptions → Create Subscription** on the topic:
   - Delivery type: **Push**
   - Push endpoint: `https://app.payablepilot.com/api/integrations/gmail/push?secret=<your-shared-secret>`
   - Acknowledgement deadline: 60s
   - Authentication: optional. The shared secret in the URL is what we
     verify against; you can also enable OIDC if you'd rather.

#### Step 2 — env vars

```
GMAIL_PUBSUB_TOPIC=projects/<gcp-project-id>/topics/gmail-push
GMAIL_PUSH_VERIFICATION_MODE=shared-secret
GMAIL_PUSH_SHARED_SECRET=<long random string, same as in the push URL>
```

#### Step 3 — connect a firm-level mailbox

When a bookkeeper hits `/api/integrations/gmail/firm-auth` and completes
OAuth, the callback automatically calls `users.watch()` on the mailbox
using the topic above. No further action needed; the renewal cron keeps
the watch alive.

#### Sanity check

After connecting, send yourself a test email to the connected mailbox.
Within ~5 seconds you should see:

- A new row in `inbox_messages` (firm_id set, business_id null at first).
- A `processing_jobs` row with type `process_inbound_email`.
- After the next worker tick, `inbox_messages.business_id` is populated
  if `sender_routes` had a matching entry — otherwise it stays as
  `routing_status='unmatched'` for manual assignment.

If nothing happens within 5 minutes, check:

- Vercel Cron is firing (Project → Logs → Functions, filter by
  `/api/integrations/gmail/poll`).
- `gmail_sync_state.last_polled_at` is recent.
- `processing_jobs.last_error` for any failed jobs.
