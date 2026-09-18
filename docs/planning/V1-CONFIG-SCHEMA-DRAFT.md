# V1 Configuration Schema Draft

This is a planning contract, not final implementation schema.

## execution_profile
- minimum_payout_percent: default 80
- fixed_stake
- max_stake
- max_simultaneous_orders
- max_orders_per_instrument
- cooldown_seconds
- operating_windows
- allowlist / blocklist
- enabled: boolean

## strategy_runner
- runner_id
- strategy_id: enum of five V1 strategy families
- expiry_seconds: one of [60, 180, 300]
- enabled
- runtime_status: STOPPED | STARTING | RUNNING | PAUSED | ERROR
- strategy_version
- preset_version
- created_at / updated_at

Unique constraint in V1: execution_profile + strategy_id + expiry_seconds.

## risk_profile
- daily_max_loss
- daily_profit_target_optional
- max_consecutive_losses
- max_open_exposure
- kill_switch
- pause_new_entries
- reset_boundary/timezone policy

## system-controlled
- data freshness thresholds
- global order-slot arbitration
- API pacing/backoff
- idempotency
- environment isolation
- broker capability checks
- stale proposal rejection
- secret handling
- audit logging

Every configuration mutation and Runner start/stop event must be versioned/auditable.
