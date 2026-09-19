# DT Checkpoint
Checkpoint: DT-CP-0006
Date: 2026-09-18
Mode: GREENFIELD
Risk: HIGH_ASSURANCE
GEF baseline: V1.0.0 governance model
State: DERIV_DATA_SCANNER_ACCEPTED_READY_FOR_QUANT_STRATEGY

## Accepted evidence
- DT-CP-0001 bootstrap accepted.
- DT-CP-0002 discovery accepted.
- DT-CP-0003 local preflight/planning-ready accepted.
- DT-CP-0004 planning baseline accepted.
- DT-CP-0005 Foundation Module accepted.
- DT-WP-02 / PR #6 exact audited head: ec9b85c87b10da053c5322fcc83183cea63a1a1b.
- Product PR workflow run #23: SUCCESS.
- Governance PR workflow run #27: SUCCESS.
- Exact-head COMMENT review id: 5254079552.
- Squash merge SHA: d520fa713b3855228b7a8c488c095655eb8162d0.
- Final compare before merge: 6 commits ahead, 0 behind; 62 changed files; 0 deletions.
- Unresolved CRITICAL/HIGH WP-02 findings: 0.

## Deriv/Data/Scanner accepted
- Current Deriv Options public WebSocket adapter.
- req_id correlation and shared public transport.
- connection supervisor, heartbeat, bounded reconnect and exactly-once restoration.
- current active_symbols/contracts_for/ticks/ticks_history/proposal normalization.
- current public error mapping and Schema Drift Guard.
- API Budget Manager with per-group backoff, execution reserve and configurable current limits.
- Symbol & Contract Registry with direction-specific expiry proof.
- one external tick stream per unique symbol with internal fan-out.
- direction-specific Opportunity Lattice.
- Payout Pulse Scheduler and actual proposal economics.
- effective payout + break-even math.
- authoritative Market Freshness Matrix over registry/capability/tick/proposal/connection/skew/trust.
- Eligibility Engine fail-closed on stale/unknown/untrusted data.
- explicit bounded continuous read-only scanner lifecycle.
- prospective tick/proposal capture.
- local Parquet + DuckDB research plane.
- tick partitions by date+symbol.
- proposal partitions by date+symbol+expiry.
- Dataset Passport.
- Data Quality Gate.
- incomplete-file recovery, disk-pressure handling and content-based compaction verification.
- bounded credential-free public Deriv smoke passed.
- deterministic CI remains offline.
- no buy/sell/account/live-money implementation.

## Architecture invariants retained
- LOCAL-FIRST / FREE-FIRST / modular-monolith-first.
- scanner eligibility is not strategy direction logic.
- web cannot import worker service internals directly.
- Trader Worker remains future economic authority boundary.
- strategies cannot execute broker orders.
- research has no economic authority.
- Git remains canonical over Hive.

## Still unproven
- Strategy engine correctness/edge.
- Shared Feature Graph behavior.
- Deterministic replay/backtest across acceptance datasets.
- Walk-forward/OOS/prospective validation of any strategy-expiry profile.
- Portfolio/multi-Runner simulation.
- Risk Engine.
- Demo execution/reconciliation.
- Any profitability claim.
- Live-money execution.

## Next legal increment
DT-WP-03 — QUANT & STRATEGY ENGINE MODULE.

Live-money remains blocked.
