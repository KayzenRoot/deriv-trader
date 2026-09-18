# V1 Local-First Topology

## Runtime topology

Browser / Local UI
        |
        v
Next.js Web App
        |
        v
Local Trader API / Worker (Node.js + TypeScript)
        |
        +--> Deriv WebSocket / REST
        |
        +--> Runner Manager
        +--> Scanner / Payout Pulse Scheduler
        +--> Risk Engine / Order Slot Arbiter
        +--> Demo Execution / Reconciliation
        |
        +--> Operational Postgres
        |
        +--> Local Research Store (Parquet + DuckDB)

## Why the trading worker is local in V1
- no cloud compute bill;
- persistent WebSocket is simple;
- lower architecture complexity;
- easy access to local research data;
- no dependence on free server sleep/quotas for order-time decisions;
- faster iteration while strategies are still being validated.

## Persistence split

### Operational database
Supabase/Postgres-compatible relational model:
- users;
- roles;
- execution profiles;
- Runner configs;
- risk configs;
- signals metadata;
- orders;
- settlements;
- audit events;
- report aggregates;
- admin flags.

### Research/time-series store
Local compressed Parquet, queried by DuckDB:
- raw/normalized ticks;
- proposal snapshots;
- feature snapshots;
- replay manifests;
- large historical datasets.

Reason: high-frequency data can outgrow a 500 MB free database quickly. Parquet/DuckDB keeps V1 free and optimized for analytical scans.

## Hot state
V1 single-node local worker uses bounded in-memory state for:
- latest ticks;
- current proposal cache;
- Runner feature windows;
- slot/risk counters that are also durably reconciled.

Redis is intentionally NOT mandatory in V1. Introduce distributed Redis only when multiple worker processes/hosts create a proven need.

## UI deployment modes
1. Fully local: default V1 development mode.
2. Vercel Hobby preview: allowed for non-commercial design/demo review.
3. Commercial SaaS: separate future deployment decision; Vercel Hobby not allowed by current terms for commercial use.

## Failure model
Cloud database outage must not silently allow unsafe trading. Order-critical state remains fail-closed and reconciled locally/broker-side.
