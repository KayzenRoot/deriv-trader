# V1 Risk & Configuration Contract

## User-configurable
- any set of validated Strategy Runners;
- minimum payout, default 80%;
- fixed stake per order;
- maximum stake;
- global maximum simultaneous open orders;
- maximum open exposure;
- maximum orders per instrument;
- daily maximum loss;
- optional daily profit target and whether reaching it stops new entries;
- maximum consecutive losses;
- global/instrument cooldown;
- operating windows;
- asset allowlist/blocklist;
- Stop All / pause new entries / emergency kill switch.

## Global safety invariants
- All Runners share one global Risk Engine.
- Strategy code cannot override risk/slot limits.
- Open-order count never exceeds max_simultaneous_orders.
- Aggregate open stake never exceeds max_open_exposure.
- Broker/API gates outrank user preferences.
- Daily hard stop and kill switch block new admissions atomically.
- No order on stale/unresolved payout/contract data.
- No duplicate purchase for the same idempotency key.
- No blind delayed execution of signals blocked by slot/risk limits.
- Demo and real environments remain isolated.

## Adaptive portfolio protection
V1 includes a Loss Cascade Brake that may throttle or pause new admissions after clustered losses. It is a risk-control layer, not a strategy-confluence engine.

## V1 deliberately excludes
Martingale, loss-chasing stake escalation, uncontrolled auto-sizing, hidden leverage and rate-limit evasion.
