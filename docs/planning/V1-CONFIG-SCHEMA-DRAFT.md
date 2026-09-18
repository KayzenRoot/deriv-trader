# V1 Configuration Schema Draft

This is a planning contract, not final implementation schema.

## execution_profile
- strategy_id: enum of five V1 strategies; exactly one
- enabled_expiries: subset of [60s, 180s, 300s]
- minimum_payout_percent: default 80
- fixed_stake
- max_stake
- max_simultaneous_orders
- max_orders_per_instrument
- cooldown_seconds
- operating_windows
- allowlist / blocklist
- enabled: boolean

## risk_profile
- daily_max_loss
- daily_profit_target_optional
- max_consecutive_losses
- max_open_exposure
- kill_switch
- pause_new_entries
- reset_boundary/timezone policy

## system-controlled, not user-overridable below safety minimum
- data freshness thresholds
- API pacing/backoff
- idempotency
- environment isolation
- broker capability checks
- stale proposal rejection
- secret handling
- audit logging

Every configuration mutation must be versioned/auditable and tied to the decisions that used it.
