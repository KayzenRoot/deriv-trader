# V1 Deriv Error Taxonomy

## Why
External errors must become deterministic internal categories so strategies never react to raw strings.

## Categories
AUTH_INVALID
AUTH_EXPIRED_OR_REVOKED
APP_ID_INVALID
OTP_EXPIRED
OTP_INVALID
RATE_LIMITED
VALIDATION_ERROR
UNSUPPORTED_CONTRACT
MARKET_UNAVAILABLE
PROPOSAL_STALE
PROPOSAL_REJECTED
BUY_REJECTED
UNKNOWN_BUY_RESULT
CONNECTION_LOST
NETWORK_TRANSIENT
SCHEMA_MISMATCH
BROKER_INTERNAL
PERMISSION_SCOPE
UNKNOWN_FAIL_CLOSED

## Retry classes
SAFE_RETRY:
- selected read-only discovery/data calls;
- transient reconnect;
- idempotent subscription restoration.

RECONCILE_BEFORE_RETRY:
- any ambiguous economic action.

DO_NOT_RETRY_WITHOUT_CHANGE:
- auth invalid;
- unsupported contract;
- validation error;
- permission/scope;
- explicit buy rejection unless new proposal/state changes.

## Audit
Store internal category + broker code/message metadata, but never credentials/tokens.

## User experience
UI shows actionable safe messages such as:
"Deriv connection expired/revoked"
"API request budget temporarily constrained"
"Contract no longer available"
rather than exposing opaque raw errors alone.
