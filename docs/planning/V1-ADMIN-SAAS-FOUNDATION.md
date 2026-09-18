# V1 Admin & Future Micro-SaaS Foundation

## V1 admin
- users/status;
- roles: USER/ADMIN;
- feature flags;
- strategy/Runner availability;
- global defaults;
- local worker health/last-seen;
- Deriv API/connection health metadata;
- scanner/job monitoring;
- audit/error viewers;
- maintenance mode;
- storage/quota health;
- user risk-profile inspection without broker secrets.

## High-risk admin actions
Suspension, global strategy disable, worker revocation and maintenance lock are explicit, auditable and reasoned.

## Ownership model
user_id is the V1 tenant boundary.
RLS/server authorization applies from day one.

## SaaS-ready now
- user-scoped domain model;
- worker binding;
- connection ownership;
- feature entitlements hooks;
- usage counters;
- audit identity.

## Deferred
- billing/subscriptions;
- organizations/teams;
- reseller/white-label;
- hosted worker fleet;
- commercial analytics.

## Rule
Preserve extension points without building unused enterprise complexity.
