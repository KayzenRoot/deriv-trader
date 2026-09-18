# V1 Acceptance Baseline

V1 is not accepted merely because UI and order calls work.

## Product
- complete dark-first UGAS-derived design system applied consistently;
- scanner shows current eligibility and freshness;
- one and only one active strategy per execution profile;
- clear strategy descriptions and limitations;
- complete configurable risk center;
- operator dashboard and admin panel usable end to end.

## Engineering
- official Deriv API contracts covered by contract tests;
- subscriptions/caching/backoff respect current API limits;
- proposal economics captured with provenance;
- deterministic strategy/risk decisions replayable from evidence;
- no secret leakage;
- demo environment isolated from any future real environment;
- reconciliation and idempotency tested;
- exact-head CI/evidence green.

## Quant research
Each strategy evaluated independently. Acceptance requires leakage-safe walk-forward/OOS evidence, robustness/sensitivity analysis and demo validation. Strategies may be rejected individually.

## Live
Live-money is NOT part of this acceptance baseline. A later explicit go-live gate is required.
