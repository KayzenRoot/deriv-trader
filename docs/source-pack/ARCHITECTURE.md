# Architecture

Status: V1 PLANNING BASELINE; final versions pinned in DT-ARCH-0001.

## Principles
LOCAL-FIRST, FREE-FIRST, HIGH_ASSURANCE, USER-ISOLATED, MODULAR-MONOLITH-FIRST.

## Runtime
One local Node.js/TypeScript Trader Worker exposes a versioned local HTTP + WebSocket/SSE API to the Next.js UI.

## Core modules
1. Next.js/React Operator + Admin UI
2. Supabase Auth + RLS operational Postgres
3. Per-user Deriv Connection Manager + SecretStore
4. Local Worker Binding
5. Deriv Connection Supervisor
6. Symbol & Contract Registry
7. Shared Market Data Pipeline
8. Market Freshness Matrix
9. Payout Pulse Scheduler
10. Market Eligibility Engine / Opportunity Lattice
11. Multi-Runner Strategy Runtime
12. Global Risk Engine + Slot Arbiter + Loss Cascade Brake
13. Demo Execution + Reconciliation
14. Event/Audit + Order Flight Recorder
15. Reporting/Analytics
16. DuckDB + Parquet Quant Lab/Replay

## Market-data rule
External subscriptions and proposal traffic are shared wherever safe. Runner count must not linearly multiply Deriv API calls.

## Execution path
authenticated user -> bound worker -> Deriv connection -> active symbols/contracts -> shared ticks -> payout/freshness eligibility -> active Runner -> Edge Gate -> Risk/Slot Gate -> final proposal refresh -> demo execution/skip -> reconciliation -> audit/reporting.

## Data
Operational: Supabase/Postgres.
High-frequency/research: local Parquet + DuckDB.
Hot state: bounded memory.
Redis not mandatory.

Governance: GEF.
Context: Hive when healthy.
Canonical truth: Git + exact-head evidence.
LLMs have no order-time authority.
