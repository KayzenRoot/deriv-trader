# V1 Strategy Selection Model

## Product rule
The V1 contains five strategies, but they are not fused into one mandatory confluence engine. The user explicitly selects one strategy profile to execute.

Exactly one strategy is active per user/profile at a time.

Global gates still apply after the selected strategy emits a signal: market open, broker eligibility, payout threshold, duration availability, user risk settings, simultaneous-order cap, cooldowns, daily stop, and platform rate/contract limits.

## UX contract
Each strategy appears as a selectable card/profile with:
- canonical strategy name;
- short description in plain language;
- what market behavior it follows;
- what generally causes an entry;
- supported expiry windows: 1m, 3m and/or 5m after validation;
- risk/limitations;
- enable/select action.

The selected strategy must be visually obvious. Strategy changes must be explicit user actions and auditable.

## Execution invariant
PAIR SCANNER -> ELIGIBILITY/PAYOUT FILTER -> SELECTED STRATEGY ONLY -> SIGNAL -> GLOBAL RISK/BROKER GATES -> ORDER OR SKIP.

No other V1 strategy may veto, confirm, blend, average or alter the selected strategy's signal unless a future separately approved feature introduces optional confirmation filters.

## Research rule
Each of the five strategies is backtested, calibrated and reported independently. A strategy can be accepted or rejected independently of the other four. No strategy is labeled profitable until Deriv-specific out-of-sample/demo evidence supports that claim.
