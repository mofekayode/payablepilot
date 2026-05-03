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
