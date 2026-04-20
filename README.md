# PayablePilot

AI-automation agency work: scrape Indeed for repeatable office-role jobs, enrich them with an automation-feasibility rubric, research the top role, then build a productized demo (PayablePilot, an AP automation assistant for SMBs).

## Layout

```
AgencyAI/
├── AccountPayableAgent/
│   ├── agent_context.md         # Product brief + demo script
│   └── demo/                    # Next.js 16 app (PayablePilot)
│       ├── src/app/             # Routes: /, /landing, /tour, /mail
│       ├── src/components/      # Views, scene tour, Gmail clone, chat bar
│       └── src/lib/             # Demo data + store + broadcast channel
├── JobListings/
│   ├── accounts-payable-clerk.json   # 557 unique jobs, 100 enriched
│   ├── operations-coordinator.json   # 100 enriched
│   └── order-processing.json         # 100 enriched
├── JobListings.backup/          # Original pre-enrichment copies
├── accounts_payable_clerk_video_notes.md   # Practitioner research
├── videos_watched.md            # Research source list
├── enrich_jobs.py               # Claude API enrichment pipeline
└── fetch_transcripts.py         # YouTube transcript fetcher
```

## Product: PayablePilot

Routes:

- `/` — live interactive product. Sidebar (Daily digest, Outbox, Inbox, Queue, Discrepancies, Payment batch, Aging, Statements, Close, Compliance, Expenses, Cards, Vendors) plus a floating chat bar.
- `/landing` — marketing page with hero + Loom placeholder, features, how-it-works, math, interactive tour preview (click to open full-screen modal), safety, final CTA.
- `/tour` — 9-scene autoplay demo (intro, inbox, match, discrepancy, digest, monthly, chat, outro).
- `/mail` — Gmail-style vendor mail clone (Summit Plumbing, Reliable Landscaping, Erin Boyd inbox). Sending fires the invoice into the live product via BroadcastChannel.

Demo persona: Greenfield Property Management (40 rental units). Vendors: Summit Plumbing, Reliable Landscaping, Metro Electric, Allied Insurance, Hillcrest Builders, Pacific Pest Control.

## Running the app

```
cd AccountPayableAgent/demo
npm install
npm run dev         # starts on http://localhost:4380
```

Open two browser windows side-by-side:
- `http://localhost:4380/mail` — the vendor Gmail (send from here)
- `http://localhost:4380/` — the PayablePilot product (watch it land here)

## Research pipeline (optional)

```
python3 -m venv .venv && source .venv/bin/activate
pip install anthropic youtube-transcript-api yt-dlp
export ANTHROPIC_API_KEY=sk-ant-...
python3 enrich_jobs.py
python3 fetch_transcripts.py
```

`enrich_jobs.py` uses Sonnet 4.6 with tool use to score each job on five criteria: automation feasibility, no-phone requirement, system specificity, workflow repeatability, and salary anchor.
