# V1 Stack Selection

## Monorepo
Use one TypeScript monorepo with npm workspaces for minimal tooling overhead and alignment with the existing GEF/Node environment.

Proposed layout:
- apps/web
- apps/trader
- packages/domain
- packages/deriv-adapter
- packages/strategies
- packages/risk
- packages/execution
- packages/research
- packages/db
- packages/ui
- packages/config
- packages/testing

## Web
Next.js + React + TypeScript.
Why: fast dashboard/admin development, strong ecosystem, Vercel preview compatibility and future SaaS readiness.

UI:
- Tailwind CSS;
- UGAS-generated design tokens/assets;
- Motion-class animation;
- open-source charting;
- responsive dark-first glassmorphism.

Admin lives in the same app behind role routes in V1. Do not build a second admin application.

## Trader worker
Node.js + TypeScript persistent process.
Responsibilities:
- Deriv sockets;
- market normalization;
- Scanner;
- Runners;
- Risk Engine;
- execution/reconciliation;
- event/audit emission.

A lightweight Fastify-class server exposes local HTTP/WebSocket/SSE interfaces to the dashboard.

## Database
PostgreSQL.
Early cloud option: Supabase Free.
Data access: lightweight typed SQL/ORM selected at implementation (Drizzle-class preferred candidate) with migrations committed to Git.

## Research
DuckDB + Parquet locally.
Reasons:
- no service bill;
- columnar compression;
- efficient backtests/analytics;
- easy dataset snapshots/hashes;
- avoids filling Supabase with raw ticks.

## Cache/queue
V1: in-process bounded queues and caches + durable Postgres outbox/event records where durability matters.
No mandatory Redis.
Future: Redis/Upstash only after distributed runtime requires it.

## Auth
Supabase Auth is the preferred early SaaS-compatible option.
Local single-user development may use a dev-auth mode that cannot accidentally be enabled in production.

## Reports
PDF and CSV generated from canonical reconciled data using open-source libraries.
Large raw research datasets are never embedded into PDF.

## Observability
V1 starts with:
- structured JSON logs;
- local rotating files;
- health endpoints;
- metrics exposed locally;
- audit/event tables;
- dashboard system-health page.

External paid observability is deferred until needed.
