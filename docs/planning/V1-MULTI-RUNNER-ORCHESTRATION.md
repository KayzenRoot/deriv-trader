# V1 Multi-Runner Orchestration

## Core concept
Multiple Strategy Runners can be active concurrently. Each Runner is a deterministic strategy-expiry engine sharing common market data but maintaining its own decision state.

## Example session
User configuration:
- fixed stake: 10
- max simultaneous open orders: 5
- minimum payout: 80%
- max orders per instrument: 1

Active Runners:
1. Trend Pulse · 1m
2. Trend Pulse · 3m
3. Trend Pulse · 5m
4. Breakout Surge · 3m
5. Anchor Pullback · 5m

All five continuously search for opportunities. The entire system may have at most five open orders at once.

## Global Order Slot Arbiter
Before execution, every valid signal requests one global order slot.

Decision order:
1. Is system started and Runner active?
2. Is market/proposal fresh and eligible?
3. Does signal still satisfy its Runner?
4. Has daily/global risk gate passed?
5. Is per-instrument exposure allowed?
6. Is a simultaneous-order slot available?
7. Do broker/API gates permit purchase now?
8. Execute or SKIP with reason.

## Slot exhaustion
If all slots are occupied:
- do not queue a time-sensitive signal for blind later execution;
- record SLOT_CAP_REACHED;
- once a slot frees, the Runner continues scanning;
- any later order requires a new/fresh signal evaluation.

## Signal races
When multiple Runners signal nearly simultaneously, a deterministic arbiter orders requests using event timestamp plus stable tie-breaking. No hidden priority based on profitability is introduced without research/governance.

## Shared data, separate brains
Runners may reuse the same normalized market-data cache for efficiency, but feature state, strategy version, expiry profile and signal decision remain separately attributable.

## Same instrument collisions
Controlled by global configuration such as max_orders_per_instrument. V1 default should be conservative. Different Runners do not automatically aggregate into one larger hidden position.

## Start/Stop semantics
- START ALL starts configured Runners only.
- STOP ALL prevents new orders immediately but does not erase/reassign already open contracts.
- STOP RUNNER prevents that Runner from opening new orders.
- Kill switch outranks every Runner and blocks all new entries.
