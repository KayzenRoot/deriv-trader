# Architecture

Status: V1 PLANNING BASELINE; final versions pinned in DT-ARCH-0001.

## Principles
LOCAL-FIRST, FREE-FIRST, HIGH_ASSURANCE.

## Core components
1. Next.js/React Operator + Admin UI
2. Supabase Auth identity/session layer
3. Per-user Deriv Connection Manager
4. SecretStore abstraction
5. Local Node.js Trader Worker
6. Deriv API Adapter
7. Shared Market Data / Eligibility / Proposal Cache
8. Payout Pulse Scheduler
9. Multi-Runner Strategy Runtime
10. Global Risk Engine + Order Slot Arbiter + Loss Cascade Brake
11. Demo Execution + Reconciliation
12. Order Flight Recorder / Audit
13. PostgreSQL Operational Store
14. DuckDB + Parquet Research Store
15. Quant Lab / Backtest Replay
16. Reporting / Analytics

## Identity boundary
Supabase Auth answers: who is the Deriv Trader user?
Deriv connection answers: which Deriv account/API authority has that user connected?
These are separate and independently revocable.

## Secrets
Local V1: OS credential-store SecretStore adapter.
Hosted future: encrypted server-side SecretStore such as Supabase Vault/KMS-equivalent.
Operational DB stores secret references/metadata only.

Execution path:
authenticated user -> selected Deriv connection -> Deriv market data -> eligible universe/payout -> active Runner -> Edge Gate -> Global Risk/Slot Gate -> final proposal refresh -> demo execution or skip -> reconciliation -> audit/reporting.

## Cloud/data
Supabase Free: operational Postgres + Auth.
High-frequency data: local Parquet + DuckDB.
Hot state: bounded in-process memory.
Redis not mandatory.
Vercel Hobby: personal/non-commercial preview only.

Governance: GEF.
Context: Hive when healthy.
Canonical truth: Git + exact-head evidence.
LLMs have no order-time authority.
