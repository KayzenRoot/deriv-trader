# Architecture

Status: V1 PLANNING BASELINE; final versions pinned in DT-ARCH-0001.

## Principles
LOCAL-FIRST, FREE-FIRST, HIGH_ASSURANCE, USER-ISOLATED.

## Core components
1. Next.js/React Operator + Admin UI
2. Supabase Auth identity/session layer
3. RLS-protected operational Postgres
4. Per-user Deriv Connection Manager
5. SecretStore abstraction
6. Local Worker Binding
7. Local Node.js Trader Worker
8. Deriv API Adapter
9. Shared Market Data / Eligibility / Proposal Cache
10. Payout Pulse Scheduler
11. Multi-Runner Strategy Runtime
12. Global Risk Engine + Order Slot Arbiter + Loss Cascade Brake
13. Demo Execution + Reconciliation
14. Order Flight Recorder / Audit
15. DuckDB + Parquet Research Store
16. Quant Lab / Backtest Replay
17. Reporting / Analytics

## Identity/ownership
Supabase Auth identifies the Deriv Trader user.
user_id is the V1 tenant boundary.
Every connection/profile/Runner/order/report belongs to one user.
RLS/backend authorization enforces ownership.

## Local worker
A local worker installation is explicitly bound to a user. Worker actions remain attributable to that user and cannot silently switch identity.

## Secrets
Local: OS credential store.
Hosted future: encrypted server-side SecretStore.
Operational DB stores references/metadata only.

## Execution path
authenticated user -> bound local worker -> selected Deriv connection -> market data -> eligible universe -> active Runner -> Edge Gate -> Global Risk/Slot Gate -> proposal refresh -> demo execution/skip -> reconciliation -> audit/reporting.

## Data
Operational/config/user/order summaries: Supabase/Postgres.
High-frequency research: local Parquet + DuckDB.
Hot state: bounded in-process memory.
Redis not mandatory.

Governance: GEF.
Context: Hive when healthy.
Canonical truth: Git + exact-head evidence.
LLMs have no order-time authority.
