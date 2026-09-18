# Decisions Ledger
ADR-0001 ACCEPTED: GEF Bootstrap V1 evidence-first lifecycle governs Deriv Trader.
ADR-0002 ACCEPTED: Git is canonical; Hive V1 is a context accelerator/memory layer and cannot override repository truth.
ADR-0003 ACCEPTED: money-moving/trading increments are HIGH_ASSURANCE.
ADR-0004 ACCEPTED: research/demo validation precede any live-money implementation or profitability claim.
ADR-0005 ACCEPTED: GEF V1 remains a separate source workspace; this repo adopts governance artifacts/contracts rather than vendoring the complete GEF implementation.
ADR-0006 SUPERSEDED: earlier one-active-strategy model replaced by ADR-0011.
ADR-0007 ACCEPTED: V1 uses Deriv Trader's own strategy runtime.
ADR-0008 ACCEPTED: internal filters inside one strategy are allowed; cross-strategy confluence is not required.
ADR-0009 ACCEPTED: strategy internals are versioned validated presets.
ADR-0010 ACCEPTED: payout/break-even use actual proposal economics.
ADR-0011 ACCEPTED: multiple concurrent Strategy Runners; one Runner = one strategy + one expiry.
ADR-0012 ACCEPTED: signals blocked by full slot capacity are not blindly queued.
ADR-0013 ACCEPTED: duplicate identical Runners are prevented.
ADR-0014 ACCEPTED: V1 architecture is LOCAL-FIRST and FREE-FIRST. Trading-critical compute remains local during V1 research/demo.
ADR-0015 ACCEPTED: Supabase Free is the preferred early operational Postgres/Auth cloud foundation, subject to re-checking current quotas before deployment.
ADR-0016 ACCEPTED: high-frequency tick/proposal research data stays out of the small cloud operational DB and uses local Parquet + DuckDB in V1.
ADR-0017 ACCEPTED: Redis is not mandatory in V1; bounded in-process state plus durable DB/event patterns are preferred until distributed runtime proves a need.
ADR-0018 ACCEPTED: Vercel Hobby is development/preview only because current terms restrict Hobby to personal/non-commercial use. Commercial hosting requires a later eligible target/plan.
ADR-0019 ACCEPTED: recurring infrastructure spend targets $0 during V1 development; any paid/overage-capable service requires explicit governance/user approval.
