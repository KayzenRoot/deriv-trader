# V1 Internal API Contract

## Goal
Keep the dashboard, local Trader Worker and domain modules loosely coupled while preserving deterministic trading authority inside the worker.

## Transport
Local development/runtime:
- HTTP for command/query operations;
- WebSocket or SSE for live state/event streaming;
- localhost binding by default.

The browser never talks directly to Deriv for trading-critical operations.

## Command endpoints (planning contract)
- POST /v1/worker/bind
- POST /v1/connections/deriv/validate
- POST /v1/connections/deriv/disconnect
- POST /v1/runners/start
- POST /v1/runners/stop
- POST /v1/runners/start-all
- POST /v1/runners/stop-all
- POST /v1/risk/pause
- POST /v1/risk/resume
- POST /v1/risk/kill
- POST /v1/risk/config
- POST /v1/execution-profile
- POST /v1/reports

## Query endpoints
- GET /v1/health
- GET /v1/worker/status
- GET /v1/connections
- GET /v1/runners
- GET /v1/risk/state
- GET /v1/orders/open
- GET /v1/orders/history
- GET /v1/dashboard/summary
- GET /v1/dashboard/timeseries
- GET /v1/reports/:id

## Live stream topics
- worker.status
- connection.status
- scanner.status
- runner.state
- runner.signal
- risk.state
- risk.block
- order.lifecycle
- reconciliation.state
- dashboard.metric
- system.alert

## Authority rule
UI commands express user intent.
The worker decides whether an action is currently admissible under auth, risk, broker and governance rules.

A successful HTTP request to start a Runner means the desired state was accepted, not that an order is guaranteed.

## Versioning
All local API payloads include schema_version.
Breaking contract changes require versioned migration or endpoint version bump.
