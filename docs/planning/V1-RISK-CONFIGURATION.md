# V1 Risk & Configuration Contract

## User-configurable
- any set of validated Strategy Runners (strategy + 1m/3m/5m);
- minimum payout: default 80%;
- fixed stake per order for V1;
- maximum stake;
- global maximum simultaneous open orders;
- maximum orders per instrument;
- daily maximum loss;
- optional daily profit target;
- maximum consecutive losses;
- global/session cooldown;
- asset allowlist/blocklist;
- operating windows;
- Stop All / pause new entries / emergency kill switch.

## Global safety invariants
- All Runners share one global Risk Engine.
- Strategy code cannot override risk or slot limits.
- Open-order count can never exceed max_simultaneous_orders.
- Broker/API gates outrank user preferences.
- No new order after daily stop or kill switch.
- No order on stale/unresolved payout/contract data.
- No duplicate purchase for the same idempotency key.
- No blind delayed execution of a signal that occurred while slots were full.
- Demo and real environments remain isolated.

## V1 deliberately excludes
Martingale, loss-chasing stake escalation, uncontrolled auto-sizing and rate-limit evasion.
