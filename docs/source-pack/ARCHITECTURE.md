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
5. Deriv Adapter
6. Public/Auth Connection Supervisors
7. API Budget Manager
8. Schema Drift Guard + Error Taxonomy
9. Symbol & Contract Registry
10. Shared Market Data Pipeline
11. Market Freshness Matrix
12. Payout Pulse Scheduler
13. Market Eligibility Engine / Opportunity Lattice
14. Multi-Runner Strategy Runtime
15. Global Risk Engine + Slot Arbiter + Loss Cascade Brake
16. Demo Execution + Reconciliation
17. Event/Audit + Order Flight Recorder
18. Reporting/Analytics
19. DuckDB + Parquet Quant Lab/Replay

## External API boundary
Prefer current Deriv Options API. Legacy compatibility, if required, stays behind the adapter.
Public market-data and authenticated demo/real sockets are separate.
Strategies/UI never consume raw Deriv payloads.

## Execution path
authenticated user -> bound worker -> authenticated account context -> shared market data -> payout/freshness eligibility -> Runner -> Edge Gate -> Risk/Slot Gate -> fresh proposal -> execution -> reconciliation -> audit.

## Data
Operational: Supabase/Postgres.
High-frequency/research: local Parquet + DuckDB.
Hot state: bounded memory.
Redis not mandatory.

Governance: GEF.
Context: Hive when healthy.
Canonical truth: Git + exact-head evidence.
LLMs have no order-time authority.
