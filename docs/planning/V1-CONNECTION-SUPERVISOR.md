# V1 Deriv Connection Supervisor

## Goal
Keep market-data transport reliable without allowing reconnect behavior to create duplicate subscriptions or stale authority.

## Responsibilities
- establish/reuse WebSocket connection(s);
- heartbeat/ping;
- connection state;
- reconnect with bounded exponential backoff + jitter;
- subscription registry;
- resubscribe idempotently after reconnect;
- req_id/correlation tracking;
- forget/unsubscribe lifecycle;
- API pressure telemetry;
- connection-level error classification.

## Current documented limit context
Deriv currently excludes ping from the normal WebSocket request budgets and documents up to 10 pings/second per connection. V1 does not need anywhere near that rate; heartbeat cadence should be conservative.

## Reconnect sequence
DISCONNECTED -> BACKOFF -> CONNECTING -> SYNCING -> HEALTHY.

During SYNCING:
- rebuild symbol/capability state as required;
- restore unique tick subscriptions;
- mark dependent market state stale until fresh events arrive;
- do not allow economic orders based solely on pre-disconnect data.

## Duplicate protection
Subscription keys are canonicalized so reconnect/start races do not create multiple subscriptions for the same underlying stream.
