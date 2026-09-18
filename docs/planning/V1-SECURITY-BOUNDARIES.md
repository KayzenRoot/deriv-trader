# V1 Security Boundaries

## Boundary 1 — Browser/UI
Untrusted for broker secrets and trading authority.
May hold Supabase user session as designed, but must not hold long-lived Deriv PATs or service-role credentials.

## Boundary 2 — Local Trader Worker
Trusted local authority for:
- SecretStore access;
- broker connection;
- Runner execution;
- Risk Engine;
- order admission/reconciliation.

Must bind only to localhost by default unless a future explicit remote-access design is approved.

## Boundary 3 — Supabase
Trusted operational identity/data platform.
RLS and backend authorization protect per-user records.

## Boundary 4 — Deriv
External broker/API boundary.
All inputs validated; all critical outputs normalized and audited.

## Boundary 5 — Research
Backtest/replay environment has no authority to create economic orders.

## Required protections
- secrets excluded from logs/audit payloads;
- CSRF/state protections for hosted OAuth flows;
- PKCE for OAuth;
- secure cookies/session handling according to implementation environment;
- rate limiting for local/admin APIs where relevant;
- strict input/schema validation;
- dependency pinning + lockfile;
- npm audit/security scans;
- no dynamic eval in trading path;
- least-privilege scopes;
- explicit demo/real separation;
- fail-closed on uncertain identity/risk/broker state.

## Local network
V1 local API defaults to loopback-only.
Remote LAN exposure is out of scope unless separately approved.

## Security events
AUTH_FAILURE
PERMISSION_DENIED
SECRETSTORE_ERROR
WORKER_BINDING_REVOKED
SUSPICIOUS_CONFIG_CHANGE
SCHEMA_DRIFT_CRITICAL
UNEXPECTED_REAL_ENVIRONMENT
ADMIN_HIGH_RISK_ACTION
