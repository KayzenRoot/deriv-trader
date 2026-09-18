# V1 Demo Execution Engine

## Scope
V1 executes in demo/paper environment first. Live execution remains gated.

## Responsibilities
- consume admitted Runner signals;
- refresh/verify proposal economics;
- enforce final payout/edge freshness;
- reserve and commit global risk/order slots;
- submit purchase with idempotency protection;
- track open contract;
- reconcile settlement;
- emit complete audit events;
- recover safely after disconnect/restart.

## Separation of authority
Strategy decides direction/opportunity.
Risk decides whether exposure is allowed.
Broker adapter decides whether the contract can be submitted.
Execution engine orchestrates the transaction.
No layer may silently override another.

## Retry policy
Market-data reconnects may retry with backoff.
Order purchase is never blindly retried after an ambiguous response.
Reconciliation precedes any retry decision.

## Recovery
On restart:
1. reload unresolved executions;
2. query/reconcile broker state;
3. rebuild slot/exposure state;
4. resume scanners/Runners only after risk state is trustworthy.
