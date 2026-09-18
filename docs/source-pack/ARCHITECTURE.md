# Architecture

Status: V1 PLANNING BASELINE; final versions pinned in DT-ARCH-0001.

## Principles
LOCAL-FIRST, FREE-FIRST, HIGH_ASSURANCE, USER-ISOLATED, MODULAR-MONOLITH-FIRST.

## Runtime
One local Node.js/TypeScript Trader Worker process hosts the trading-critical modules and exposes a versioned local HTTP + WebSocket/SSE API to the Next.js UI.

## Core modules
1. Next.js/React Operator + Admin UI
2. Supabase Auth identity/session
3. RLS-protected operational Postgres
4. Per-user Deriv Connection Manager
5. SecretStore
6. Local Worker Binding
7. Deriv Adapter
8. Market Data / Eligibility / Proposal Cache
9. Payout Pulse Scheduler
10. Multi-Runner Strategy Runtime
11. Global Risk Engine + Slot Arbiter + Loss Cascade Brake
12. Demo Execution + Reconciliation
13. Event/Audit model + Order Flight Recorder
14. Reporting/Analytics
15. DuckDB + Parquet Quant Lab/Replay

## Authority
Browser/UI expresses intent only.
Trading authority stays inside the worker.
Strategies cannot submit broker orders.
Risk admission is centralized.
Execution cannot bypass risk.
Admin cannot bypass user ownership or live gates.

## Data
Operational: Supabase/Postgres.
Research/time-series: local Parquet + DuckDB.
Hot state: bounded in-memory structures.
Redis not mandatory.

## Scale strategy
V1 is a modular monolith locally. Split services only after measured scale/reliability requirements justify the operational cost.

Governance: GEF.
Context: Hive when healthy.
Canonical truth: Git + exact-head evidence.
LLMs have no order-time authority.
