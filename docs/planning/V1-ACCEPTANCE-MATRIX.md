# V1 Acceptance Matrix

| Area | Required evidence | Blocking |
| --- | --- | --- |
| Bootstrap | exact stack, lockfile, CI | YES |
| Auth/RLS | user isolation/security tests | YES |
| Deriv API | current contract tests/demo auth | YES |
| Data | Passport + DQG + replay | YES |
| Scanner | eligible universe + freshness + payout | YES |
| Strategies | independent Runner evidence | YES per enabled profile |
| Risk | concurrency/hard-limit tests | YES |
| Demo Execution | reconciliation/idempotency/recovery | YES |
| Dashboard | complete operator UX/reporting | YES |
| Admin/Security | roles, audit, fail-closed | YES |
| Quant Acceptance | OOS/prospective/demo evidence | YES per enabled profile |
| Live Money | separate future gate | OUTSIDE V1 |

## Profile-level exception
One failed expiry profile does not block V1 if it is disabled and the remaining advertised Runner set satisfies the product contract.

## Evidence rule
Feature existence without exact-head tests/evidence is not acceptance.
