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
5. Deriv Adapter + Connection Supervisors
6. API Budget Manager + Schema Drift Guard
7. Symbol/Contract Registry + Market Data Pipeline
8. Market Freshness Matrix + Payout Pulse + Eligibility
9. Multi-Runner Strategy Runtime
10. Global Risk Engine + Slot Arbiter + Loss Cascade Brake
11. Demo Execution + Reconciliation
12. Event/Audit + Order Flight Recorder
13. Operational Postgres
14. Local Capture Writer
15. Parquet Research Store
16. DuckDB Quant/Replay Engine
17. Dataset Passport + Data Quality Gate
18. Reporting/Analytics

## Data placement
Operational/user/order state: Supabase/Postgres.
Raw/high-frequency market, proposal and research data: local Parquet.
Analytical queries/backtests: DuckDB.
Hot state: bounded memory.
Redis not mandatory.

## Evidence
Acceptance-grade quant results require an immutable Dataset Passport plus Data Quality Gate pass.

Governance: GEF.
Context: Hive when healthy.
Canonical truth: Git + exact-head evidence.
LLMs have no order-time authority.
