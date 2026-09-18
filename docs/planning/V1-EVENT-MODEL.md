# V1 Domain Event Model

## Purpose
Create one shared event vocabulary for dashboard updates, audit, analytics and deterministic recovery.

## Core event envelope
- event_id
- event_type
- schema_version
- occurred_at
- user_id
- worker_id
- execution_profile_id optional
- runner_id optional
- connection_id optional
- order_id optional
- correlation_id
- causation_id
- payload
- build_git_sha

## Event families

### Identity / connection
USER_SESSION_BOUND
WORKER_BOUND
WORKER_REVOKED
DERIV_CONNECTION_VALIDATED
DERIV_CONNECTION_FAILED
DERIV_CONNECTION_DISCONNECTED

### Runner
RUNNER_START_REQUESTED
RUNNER_STARTED
RUNNER_STOP_REQUESTED
RUNNER_STOPPED
RUNNER_ERROR
SIGNAL_EMITTED
SIGNAL_SKIPPED

### Risk
RISK_STATE_CHANGED
RISK_BLOCKED
SLOT_RESERVED
SLOT_RELEASED
LOSS_CASCADE_STATE_CHANGED
DAILY_STOP_TRIGGERED
KILL_SWITCH_TRIGGERED

### Execution
PROPOSAL_REFRESHED
ORDER_SUBMIT_REQUESTED
ORDER_SUBMITTED
ORDER_OPENED
ORDER_RECONCILIATION_REQUIRED
ORDER_RECONCILED
ORDER_SETTLED
ORDER_REJECTED

### System
SCANNER_STATE_CHANGED
API_RATE_PRESSURE
DATA_STALE
SYSTEM_ALERT
REPORT_GENERATED

## Append-only rule
Material decision/execution events are append-only. Corrections use compensating/reconciliation events rather than mutating history invisibly.

## Analytics
Dashboard aggregates may be rebuilt from canonical events plus reconciled order state.
