# V1 Non-Functional Requirements

## Reliability
Scanner and execution services must recover from transient disconnects without duplicate orders. State reconciliation is authoritative after reconnect.

## Performance
UI should remain responsive under full eligible-instrument scanning. Strategy evaluation should not be delayed by slow admin/analytics work. Order-time critical path must be deterministic and bounded.

## API stewardship
Respect documented Deriv limits using subscription-first design, connection reuse, caching, bounded queues, backoff and jitter. Never implement rate-limit evasion.

## Security
No credentials in repository, logs or client-visible admin payloads. Demo/live secrets and environments isolated. Least privilege for future authenticated surfaces.

## Observability
Structured logs, health, scanner lag/freshness, queue depth, proposal freshness, risk blocks, strategy signals, order/reconciliation events and API-limit pressure.

## Auditability
Given an order or skip decision, the system must be able to reconstruct: exact code version, strategy, config version, market/proposal snapshot, risk state and decision reasons.

## UX
Dark-first, glassmorphism, accessible contrast, responsive layout, explicit loading/error/stale states. Visual polish may not hide safety-critical information.

## Maintainability
Strong typed contracts, adapter boundaries, strategy isolation and tests that allow one strategy to evolve without destabilizing the other four.
