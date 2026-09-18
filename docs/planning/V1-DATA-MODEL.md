# V1 Operational Data Model

## Goal
Support local-first single-user operation today while preserving clean ownership boundaries for future micro-SaaS.

## Ownership rule
Every user-owned operational record is scoped by user_id from Supabase Auth.

V1 does not introduce organizations/teams unless needed. The user is the tenant boundary for now.

## Core tables

### profiles
- user_id PK/FK auth.users
- role: USER | ADMIN
- display_name
- timezone
- created_at / updated_at

### deriv_connections
- connection_id
- user_id
- auth_method
- deriv_app_id
- selected_account_id
- selected_environment
- secret_ref
- status
- scopes
- last_validated_at
- last_error_code
- created_at / updated_at

### execution_profiles
- execution_profile_id
- user_id
- connection_id
- name
- minimum_payout_percent
- fixed_stake
- max_stake
- max_simultaneous_orders
- max_orders_per_instrument
- max_open_exposure
- operating_windows
- allowlist/blocklist
- enabled
- created_at / updated_at

### risk_profiles
- risk_profile_id
- execution_profile_id
- daily_max_loss
- daily_profit_target_optional
- stop_on_daily_target
- max_consecutive_losses
- cooldowns
- kill_switch
- pause_new_entries
- loss_cascade policy/version
- reset timezone
- created_at / updated_at

### strategy_runners
- runner_id
- execution_profile_id
- strategy_id
- expiry_seconds
- strategy_version
- preset_version
- enabled
- desired_state
- runtime_state
- created_at / updated_at

Unique V1 constraint:
execution_profile_id + strategy_id + expiry_seconds.

### signals
- signal_id
- user_id
- runner_id
- instrument
- direction
- signal_at
- quality/calibration metadata
- proposal/economics reference
- decision reason
- outcome: ADMITTED | BLOCKED | SKIPPED | EXPIRED

### orders
- order_id
- user_id
- runner_id
- deriv_connection_id
- instrument
- direction
- expiry_seconds
- stake
- ask_price
- payout
- status
- broker_contract_id
- idempotency_key
- opened_at
- settled_at
- net_pnl
- reconciliation_status

### order_events
Append-only lifecycle records for each order.

### risk_events
Append-only risk state/decision records.

### audit_events
User/admin/config/connection/runner/system audit trail.
Secret values are excluded.

### daily_metrics
Pre-aggregated per-user/per-day metrics for dashboard speed.

### report_jobs
Metadata/status for PDF/CSV report generation.

### local_worker_instances
- worker_id
- user_id
- device_label
- installation_id
- version
- last_seen_at
- state
- capabilities
No broker secret is stored here.

## Large datasets
Raw ticks, proposal captures and research datasets are NOT stored in these operational tables by default. They remain in local Parquet/DuckDB and are referenced by dataset/evidence identifiers.

## Migration rule
All schema migrations are versioned in Git and reproducible. No manual production-only table edits.
