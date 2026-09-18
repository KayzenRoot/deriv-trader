# V1 Risk & Configuration Contract

## User-configurable
- active strategy: exactly one of five;
- minimum payout: default 80%, never below product safety floor unless a future approved policy changes it;
- allowed expiries: 1m / 3m / 5m individually enabled;
- fixed stake per order for V1;
- maximum stake;
- maximum simultaneous open orders;
- daily maximum loss;
- optional daily profit target that stops new entries when reached;
- maximum consecutive losses;
- maximum orders per instrument;
- global/session cooldown;
- asset allowlist/blocklist;
- operating time windows;
- emergency pause / kill switch.

## Global safety invariants
- Risk gates can block any strategy signal.
- Strategy code cannot override risk limits.
- Broker/API capability and rate-limit gates outrank user preferences.
- No new order after daily loss stop or kill switch.
- No order if payout/contract data is stale or unresolved.
- No duplicate purchase for the same idempotency key.
- Demo and real environments are isolated.

## V1 deliberately excludes
Martingale, loss-chasing stake escalation, uncontrolled auto-sizing, and any setting designed to evade broker controls.
