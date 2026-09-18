# V1 Local Process Model

## V1 simplicity target
Avoid microservices. The local runtime is one Trader Worker process with internal modules.

## Process
trader-worker
  - auth/binding module
  - Deriv connection manager
  - market data adapter
  - Payout Pulse Scheduler
  - Runner manager
  - strategy engines
  - Risk Engine
  - execution/reconciliation
  - audit/event writer
  - local API/stream server
  - report job coordinator

## Why one process
- simpler startup;
- no service-discovery;
- no distributed locking;
- no Redis requirement;
- easy local debugging;
- cheaper/faster Codex implementation;
- lower failure surface for V1.

## Concurrency model
Use explicit bounded async queues and domain locks/atomic sections only where correctness requires them:
- order-slot admission;
- risk-state transition;
- idempotent order submission;
- reconciliation.

Strategy evaluations and market processing may run concurrently but cannot bypass the centralized admission boundary.

## Future split points
If scale later requires it, the first logical separations are:
1. hosted worker fleet;
2. research/backtest jobs;
3. reporting/analytics;
4. notification service.

No split occurs in V1 without measured need.
