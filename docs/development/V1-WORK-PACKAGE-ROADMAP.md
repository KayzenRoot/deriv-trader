# V1 Development Work-Package Roadmap

Status: ACTIVE
Base checkpoint: DT-CP-0005

The implementation plan is intentionally consolidated into large coherent Work Packages to reduce prompt count and repeated context.

## WP-01 — Foundation Module
Status: APPROVED / MERGED
Covers repository bootstrap, monorepo, stack, CI, worker/web skeleton, package boundaries and developer foundation.

## WP-02 — Deriv Data & Scanner Module
Status: READY
Covers:
- current Deriv Options public API adapter;
- connection supervisor;
- request/subscription correlation;
- API Budget Manager;
- schema drift/error normalization;
- active symbols / contracts / ticks / tick history / proposals;
- shared market-data subscriptions;
- Symbol & Contract Registry;
- Market Freshness Matrix;
- Payout Pulse Scheduler;
- Eligibility Engine / Opportunity Lattice;
- prospective tick/proposal capture;
- Parquet + DuckDB research store;
- Dataset Passport + Data Quality Gate;
- data recovery/retention/compaction baseline.

No buy/sell/live-money implementation.

## WP-03 — Quant & Strategy Engine Module
Planned:
Quant Lab, replay/backtester, Shared Feature Graph, Edge Gate, five strategy families, 1m/3m/5m Runner profiles, validation pipeline and research evidence.

## WP-04 — Risk & Demo Execution Module
Planned:
Global Risk Engine, slot arbiter, Loss Cascade Brake, lifecycle, idempotency, demo execution, reconciliation, restart recovery and Order Flight Recorder.

## WP-05 — Product UI & Identity Module
Planned:
Supabase Auth/RLS user flows, per-user Deriv connection UX, SecretStore production adapter, Dashboard, Scanner UI, Strategy Control Center, Orders, Analytics, Risk, Reports, Settings, Admin, System Health and notifications, with UGAS assets when available.

## WP-06 — Integration & V1 Acceptance Module
Planned:
End-to-end integration, E2E, performance, security, failure recovery, full A0-A11 acceptance, corrections and V1 demo release evidence.

## Rule
A package may absorb multiple historical backlog items when they form one coherent architectural domain. Corrective work is consolidated whenever practical.
