# Test invoice suite

Generate again: `node scripts/generate-test-suite.mjs`

- **test-invoice-hvac-emergency.pdf** — HVAC emergency repair — exercise full auto-coding (vendor + project + Repairs & Maintenance)
- **test-invoice-painting-115pine.pdf** — Painting work at 115 Pine — different vendor + different project (auto-match should still hit both)
- **test-invoice-landscaping-22oak.pdf** — Monthly landscaping at 22 Oak — third vendor + third project, light service
- **test-invoice-office-supplies-staples.pdf** — Office supplies — vendor NOT in QBO seed (Staples Business). Tests fallback when auto-vendor-match misses
- **test-invoice-rental-scissor-lift.pdf** — Equipment rental — Sunbelt Rentals at 22 Oak (rental + supplies keywords)
- **test-invoice-hvac-duplicate-of-1.pdf** — DUPLICATE TEST — same vendor + same invoice number as #1 (CHV-6128). Should flag immediately when sent alongside.
- **test-invoice-hvac-unknown-project.pdf** — HVAC at 999 Cypress (project NOT seeded). Vendor + account auto-match, project picker stays empty.
