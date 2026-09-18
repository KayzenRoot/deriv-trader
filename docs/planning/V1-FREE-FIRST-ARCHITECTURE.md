# V1 Free-First Architecture

Verified planning date: 2026-09-18.

## Governing principle
V1 is LOCAL-FIRST and FREE-FIRST.

The trading-critical path runs locally during V1:
- Deriv WebSocket market connection;
- scanner;
- Strategy Runners;
- payout/edge evaluation;
- Global Risk Engine;
- Order Slot Arbiter;
- demo execution/reconciliation;
- raw market/proposal capture.

Cloud services are used only where their current free tier materially helps development, preview, authentication, persistence or reporting.

No architecture decision assumes a free tier will remain unchanged. Current quotas are recorded and must be re-verified before deployment.

## Chosen initial services

### Supabase Free — ACCEPTED for early cloud data/auth
Use for:
- PostgreSQL operational metadata;
- user/auth foundation;
- user/config/risk profiles;
- order/event summaries;
- dashboard aggregates;
- small report metadata;
- optional small asset/report storage.

Current verified Free plan:
- $0/month;
- 500 MB database/project;
- 50,000 MAU;
- 5 GB egress + 5 GB cached egress;
- 1 GB file storage;
- 2 active projects;
- free projects may pause after 1 week inactivity.

Constraint: raw high-frequency ticks/proposals MUST NOT be dumped indiscriminately into the 500 MB cloud database.

Official source: https://supabase.com/pricing

### Vercel Hobby — ACCEPTED only for non-commercial dev/preview
Use for:
- preview deployments of the Next.js dashboard;
- UX review;
- personal/non-commercial development.

Current verified:
- $0/month Hobby;
- current Hobby includes CI/CD/CDN/Fluid compute quotas;
- Vercel terms currently restrict Hobby to personal/non-commercial use.

Therefore Vercel Hobby is NOT the approved commercial micro-SaaS production plan. Before charging users, move to an eligible paid plan or another commercially suitable hosting target.

Official sources:
- https://vercel.com/pricing
- https://vercel.com/legal/terms

### Upstash Redis Free — NOT core V1; OPTIONAL later
Current verified Free tier includes 256 MB, 500K commands/month and 10 GB bandwidth.

This quota is useful for prototypes/session/cache workloads, but a high-frequency trading scanner could consume 500K commands quickly. V1 therefore does not place market ticks, Runner hot-state or order admission correctness behind Upstash.

Use only after measurement for low-volume cache/coordination tasks.

Official source: https://upstash.com/pricing/redis

### Cloudflare Workers Free — OPTIONAL future edge/gateway
Current verified Free plan includes 100K requests/day and WebSocket support is billed from the connection/request model; Free CPU is constrained.

Useful later for an edge API/gateway or experiments, but not selected as the V1 trading brain because the local persistent worker is simpler and safer for HIGH_ASSURANCE operation.

Official source: https://developers.cloudflare.com/workers/platform/pricing/

## Open-source/free local stack
- TypeScript / Node.js current LTS at implementation time;
- Next.js + React for UI;
- Tailwind CSS + UGAS design tokens/assets;
- Motion for animation;
- charting library selected from current open-source options;
- Fastify-class lightweight HTTP/WebSocket backend framework;
- PostgreSQL-compatible access via Supabase/Postgres;
- DuckDB + Parquet for local research/time-series files;
- Vitest-class unit/integration testing;
- Playwright-class end-to-end testing;
- structured JSON logs + local observability.

Exact library versions are pinned during DT-ARCH-0001 implementation planning, not guessed now.
