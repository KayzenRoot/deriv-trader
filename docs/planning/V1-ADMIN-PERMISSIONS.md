# V1 Admin & Permission Model

## Roles
V1 keeps authorization intentionally small:
- USER
- ADMIN

No organization/team hierarchy in V1.

## USER permissions
A user may:
- manage their own profile;
- connect/disconnect their own Deriv account;
- manage their own execution/risk profiles;
- start/stop their own Runners;
- view their own orders, analytics, reports and audit history;
- configure notifications;
- manage their own local worker binding.

A user may not:
- inspect another user's data;
- change system-wide feature flags;
- enable rejected/suspended strategy profiles;
- bypass risk/governance gates;
- access broker secrets after save.

## ADMIN permissions
Admin may:
- inspect user/account status;
- manage feature flags;
- enable/disable strategy/expiry availability globally;
- inspect non-secret health and operational telemetry;
- inspect audit trails and system errors;
- suspend users/workers/Runners;
- manage maintenance mode;
- inspect quota/cost/system-health dashboards.

Admin may not:
- reveal plaintext PAT/OAuth tokens;
- silently place trades on behalf of users;
- bypass global live-money gate;
- mutate historical audit records;
- alter accepted research evidence in place.

## High-risk admin actions
Actions such as user suspension, strategy global disable, worker revocation, maintenance lock or future live-gate changes require:
- explicit confirmation;
- audit event;
- actor identity;
- reason;
- timestamp;
- previous/new value.

## Least privilege
Service-role/backend privileges are server-only.
Browser routes are never trusted as an authorization boundary by themselves.
