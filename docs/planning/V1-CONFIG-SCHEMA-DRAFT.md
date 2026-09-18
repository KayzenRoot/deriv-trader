# V1 Configuration Schema Draft

## execution_profile
- minimum_payout_percent: default 80
- fixed_stake
- max_stake
- max_simultaneous_orders
- max_orders_per_instrument
- cooldown_seconds
- operating_windows
- allowlist / blocklist
- enabled

## strategy_runner
- runner_id
- strategy_id
- expiry_seconds: [60, 180, 300]
- enabled
- runtime_status
- strategy_version
- preset_version
- created_at / updated_at

Unique constraint: execution_profile + strategy_id + expiry_seconds.

## risk_profile
- daily_max_loss
- daily_profit_target_optional
- stop_on_daily_target: boolean
- max_consecutive_losses
- max_open_exposure
- max_orders_per_instrument
- global_cooldown_seconds
- instrument_cooldown_seconds
- kill_switch
- pause_new_entries
- loss_cascade_brake_enabled
- loss_cascade_policy_version
- reset_boundary_timezone

## system-controlled
- data freshness thresholds
- global order-slot arbitration
- API pacing/backoff
- idempotency
- environment isolation
- broker capability checks
- stale proposal rejection
- audit logging

Every config mutation and risk-state transition is versioned/auditable.
