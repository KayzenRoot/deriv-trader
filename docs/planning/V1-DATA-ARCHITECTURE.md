# V1 Data Architecture

## Principle
Operational data and research/time-series data have different cost, access and retention profiles and are stored separately.

## Operational plane — Supabase/Postgres
Store:
- users/profiles;
- Deriv connection metadata;
- execution/risk profiles;
- Runner configuration/state summaries;
- orders/settlements;
- risk/audit events;
- dashboard aggregates;
- report metadata.

Do NOT use the operational database as the raw tick warehouse.

## Research plane — local Parquet + DuckDB
Store:
- normalized ticks;
- proposal/payout snapshots;
- feature snapshots where required;
- historical imports;
- replay manifests;
- backtest outputs;
- demo/shadow execution datasets.

## Hot plane — bounded memory
Keep only the current data windows required for:
- latest market state;
- strategy features;
- payout/proposal cache;
- risk/order slots.

## Durability
If data is required to reproduce a decision, it must be persisted or reconstructable from a versioned dataset + manifest.
