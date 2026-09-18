# V1 Acceptance Baseline

## Product
- complete UGAS-derived dark-first design system;
- scanner shows current eligibility/freshness;
- multiple strategy-expiry Runners can be selected, started and stopped independently;
- Start All / Stop All works;
- global simultaneous-order cap is visible and enforced across all Runners;
- strategy descriptions/limitations are clear;
- complete configurable risk center;
- dashboard shows active Runner status and slots used/total;
- complete analytics/reporting and admin panel.

## Engineering
- official Deriv API contracts covered by contract tests;
- shared subscriptions/caching avoid waste across Runners;
- deterministic Runner/risk decisions replayable;
- no global order-cap breach under concurrent signal races;
- stale signals are never blindly queued for later execution;
- proposal economics captured with provenance;
- reporting attributes every order to exact Runner;
- no secret leakage;
- demo environment isolated;
- reconciliation/idempotency/concurrency tests pass;
- exact-head CI/evidence green.

## Quant research
Each strategy-expiry profile is evaluated independently. Profiles may be rejected individually.

## Live
Live-money is NOT part of V1 acceptance and requires a later explicit go-live gate.
