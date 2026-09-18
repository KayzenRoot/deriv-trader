# V1 Local-First Topology

## Runtime

Browser / Local UI
        |
        v
Supabase Auth session
        |
        v
Local Worker Binding
        |
        v
Local Trader API / Worker
        |
        +--> User's SecretStore credential
        +--> Deriv WebSocket / REST
        +--> Runner Manager
        +--> Scanner / Payout Pulse Scheduler
        +--> Risk Engine / Order Slot Arbiter
        +--> Demo Execution / Reconciliation
        +--> Operational Postgres
        +--> Local Parquet / DuckDB

## User boundary
The local worker is bound to one authenticated user context at a time. Every order carries user_id, connection_id and runner_id attribution.

## Why local
No cloud compute bill, simple persistent WebSocket, easier local research, fewer free-tier reliability dependencies.

## Persistence
Supabase/Postgres: user/config/connection metadata/orders/audit/aggregates.
Local Parquet/DuckDB: ticks, proposals, features, replays, large datasets.

## Hot state
Bounded in-memory state for market windows/proposals/Runner/risk counters with durable reconciliation where correctness requires it.

## Cloud outage
Cloud outage must not silently reset identity/risk. If required authority/state cannot be proven, new economic actions fail closed.

## SaaS evolution
Hosted workers can later replace the local worker without changing the user-owned domain model.
