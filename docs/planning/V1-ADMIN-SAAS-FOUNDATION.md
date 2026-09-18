# V1 Admin & Future Micro-SaaS Foundation

## V1 admin
- users and status;
- roles: user/admin;
- feature flags;
- strategy/Runner availability;
- system defaults;
- health;
- local worker instances/last seen;
- scan/job monitoring;
- audit viewer;
- error/event viewer;
- environment state;
- broker/API connection health metadata;
- user risk-profile inspection without exposing secrets.

## Ownership model
user_id is the V1 tenant boundary.

All user-owned records are isolated by RLS/ownership rules from day one. This avoids retrofitting tenant ownership later.

## SaaS-ready now
- user-scoped domain model;
- worker installation binding;
- connection ownership;
- entitlement/feature-flag hooks;
- usage counters;
- audit identity;
- plan field/hooks can be added without changing trading domain keys.

## Deferred
- billing/subscriptions;
- organizations/teams;
- reseller/white-label;
- shared team accounts;
- hosted worker fleet;
- full commercial analytics.

## Rule
Do not build multi-organization complexity in V1. Preserve extension points, not unused enterprise machinery.
