# V1 Acceptance Baseline

## Product
- complete UGAS-derived dark-first design;
- multiple strategy-expiry Runners start/stop independently;
- Start All / Stop All;
- complete configurable Risk Center;
- global simultaneous-order and exposure caps visible/enforced;
- daily stop/target, loss streak, cooldown and kill-switch behavior visible;
- Loss Cascade Brake state visible;
- complete dashboard, reports and admin panel.

## Engineering
- official Deriv API contracts covered;
- deterministic Runner/risk replay;
- no global order-cap or exposure-cap breach under concurrency;
- daily stop/kill transitions atomic;
- stale signals never blindly delayed;
- all risk blocks have reason codes;
- proposal economics captured with provenance;
- no secret leakage;
- demo environment isolated;
- reconciliation/idempotency/concurrency/risk tests pass;
- exact-head CI/evidence green.

## Quant research
Each strategy-expiry profile is independently evaluated. Portfolio simulation also measures shared risk/slot effects.

## Live
Live-money is excluded and requires a later explicit go-live gate.
