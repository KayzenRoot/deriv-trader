# DT Checkpoint
Checkpoint: DT-CP-0004
Date: 2026-09-18
Mode: GREENFIELD
Risk: HIGH_ASSURANCE
GEF baseline: V1.0.0 governance model
State: PLANNING_BASELINE_ACCEPTED_READY_FOR_DEV_BOOTSTRAP

## Accepted evidence
- DT-CP-0001 bootstrap accepted.
- DT-CP-0002 discovery accepted.
- DT-CP-0003 local preflight/planning-ready accepted.
- DT-PLAN-0001 PR #4 exact audited head: 1c056801f3056fa50ca3d28261d180b012bab756.
- Governance workflow run #11: SUCCESS on exact audited head.
- Exact-head COMMENT review id: 5251462702.
- Squash merge SHA: 896e802bd452f963a162cbb9965ed298c056f192.
- Final compare before merge: 38 commits ahead, 0 behind; no file deletions.
- Final semantic consistency findings F-01..F-04: corrected.
- CRITICAL/HIGH unresolved planning findings: 0.

## Accepted V1 baseline
- LOCAL-FIRST / FREE-FIRST / modular-monolith-first.
- Supabase Auth + RLS for product identity/ownership.
- Per-user Deriv connection with SecretStore abstraction.
- Local PAT + App ID for initial local flow; hosted OAuth 2.0 + PKCE path reserved for future SaaS implementation after current-doc verification.
- Multiple concurrent Strategy Runners; one Runner = one strategy family + one expiry profile.
- Five strategy families; 1m/3m/5m profiles validated independently.
- No mandatory cross-strategy confluence.
- Global Risk Engine + Order Slot Arbiter + Loss Cascade Brake.
- Shared market data, Market Freshness Matrix, Payout Pulse Scheduler and API Budget Manager.
- Proposal-aware Edge Gate using actual ask_price/payout economics.
- Demo/paper-first execution, reconciliation and Order Flight Recorder.
- Complete dashboard, scanner, strategy control, orders, analytics, risk, reports, settings, admin and system health UX.
- Supabase/Postgres operational plane; local Parquet + DuckDB research plane.
- Dataset Passport + Data Quality Gate.
- Frozen bootstrap technology lines documented in V1-STACK-FREEZE.md.
- A0-A11 end-to-end acceptance gates and V1 DoD accepted.
- UGAS is the required visual-asset production pipeline.

## Hive compatibility
- Git remains canonical.
- Hive lexical retrieval/memory remain usable as optional accelerators.
- DT-HIVE-COMPAT-0001 remains IMPORTANT/PARALLEL, not a blocker to first coding increment.
- First Deriv Trader bootstrap must add/validate explicit .gitattributes EOL policy.

## Still unproven
- Actual V1 implementation.
- Exact final compatible dependency patch set/lockfile.
- Runtime Deriv contract behavior under our adapter.
- Prospective proposal/payout distribution.
- Any strategy edge/profitability.
- Demo end-to-end execution/reconciliation.
- Commercial/live regulatory suitability.
- Live-money execution.

## Next legal increment
1. DT-DEV-BOOTSTRAP-0001 — first development Work Order.
2. DT-UX-0001 and other non-conflicting groundwork may follow/parallelize only after governed Work Orders.
3. DT-HIVE-COMPAT-0001 may proceed in parallel as an IMPORTANT compatibility improvement.

No live-money implementation is admitted.
