# Architecture

Status: V1 PLANNING BASELINE; final versions pinned in DT-ARCH-0001.

## Principles
LOCAL-FIRST, FREE-FIRST, HIGH_ASSURANCE.

## Core components
1. Next.js/React Operator + Admin UI
2. Local Node.js Trader Worker
3. Deriv API Adapter
4. Shared Market Data / Eligibility / Proposal Cache
5. Payout Pulse Scheduler
6. Multi-Runner Strategy Runtime
7. Global Risk Engine + Order Slot Arbiter + Loss Cascade Brake
8. Demo Execution + Reconciliation
9. Order Flight Recorder / Audit
10. PostgreSQL Operational Store
11. DuckDB + Parquet Research Store
12. Quant Lab / Backtest Replay
13. Reporting / Analytics

Execution path:
Deriv market data -> shared normalized cache -> eligible universe/payout -> independent active Runner -> Edge Gate -> Global Risk/Slot Gate -> final proposal refresh -> demo execution or skip -> reconciliation -> audit/reporting.

## Data placement
Operational/config/user/order summaries: PostgreSQL/Supabase-compatible.
High-frequency raw ticks/proposals/research files: local Parquet + DuckDB.
Hot market/Runner state: bounded in-process memory in V1.

Redis is not mandatory in V1.

## Cloud
Supabase Free is the preferred early operational cloud database/auth foundation.
Vercel Hobby may host personal/non-commercial UI previews only under current terms.
Trading-critical compute remains local in V1.

Governance: GEF.
Context: Hive when healthy.
Canonical truth: Git + exact-head evidence.
LLMs have no order-time decision authority.
