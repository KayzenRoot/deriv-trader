# Architecture

Status: V1 PLANNING BASELINE / STACK FROZEN FOR BOOTSTRAP.

## Principles
LOCAL-FIRST, FREE-FIRST, HIGH_ASSURANCE, USER-ISOLATED, MODULAR-MONOLITH-FIRST.

## Frozen V1 technology lines
- Node.js 24 LTS
- TypeScript 6.x
- Next.js 16.3.x Active LTS / security line (reconciled CORRECTION 001; see V1-STACK-FREEZE.md)
- React 19.2.x
- Tailwind CSS 4.3.x
- Motion 13.x
- Apache ECharts 6.1.x
- Fastify 5.12.x
- Supabase JS 2.x
- PostgreSQL / Supabase
- DuckDB 1.5.5 + Parquet
- Vitest 5.0.x
- Playwright 1.55.x

Exact compatible patch versions are locked by package-lock.json during bootstrap.

## Runtime
One local Node.js/TypeScript Trader Worker plus Next.js UI.

## Authority
UI expresses intent only.
Trader Worker owns market/broker authority.
Strategies cannot execute orders.
Risk is centralized and mandatory.
Research has no economic side effects.

## Data
Operational: Supabase/Postgres.
Research/high frequency: local Parquet + DuckDB.
Hot state: bounded memory.
Redis not mandatory.

## Dependency policy
No circular package dependencies; critical package boundaries are enforced and audited.

Governance: GEF.
Context: Hive when healthy.
Canonical truth: Git + exact-head evidence.
LLMs have no order-time authority.
