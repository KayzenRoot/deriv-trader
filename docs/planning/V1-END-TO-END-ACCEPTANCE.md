# V1 End-to-End Acceptance Map

## Purpose
Define the objective evidence required before Deriv Trader V1 can be called complete.

V1 completion means: product works end to end in the approved demo/paper scope, is observable/auditable, has validated Runner profiles, and satisfies security/risk/data requirements.

Live-money execution is explicitly excluded.

## Gate A0 — Repository / Bootstrap
PASS requires:
- frozen stack implemented with exact compatible versions;
- monorepo structure matches architecture;
- package-lock committed;
- lint/typecheck/unit baseline green;
- no critical/high dependency vulnerabilities;
- GEF governance artifacts current;
- Git exact-head evidence produced.

## Gate A1 — Identity / User Isolation
PASS requires:
- Supabase Auth integration;
- USER/ADMIN roles;
- per-user ownership/RLS;
- Local Worker Binding;
- per-user Deriv connection metadata;
- SecretStore with no plaintext broker secret in normal tables/logs/browser after save;
- permission/security tests green.

## Gate A2 — Deriv Adapter / API
PASS requires:
- current API contract tests;
- public market socket;
- active symbols/contracts/ticks/proposal parsing;
- authenticated demo connection path;
- schema drift guard;
- API budget manager;
- error taxonomy;
- reconnect/resubscribe tests;
- no live-money path admitted.

## Gate A3 — Data / Research
PASS requires:
- tick/proposal capture;
- Parquet/DuckDB research store;
- Dataset Passport;
- Data Quality Gate;
- deterministic replay;
- leakage-safe partitions;
- proposal-aware expectancy evidence where payout claims are made.

## Gate A4 — Scanner / Eligibility
PASS requires:
- full supported active universe discovery;
- 1m/3m/5m capability mapping;
- shared market subscriptions;
- freshness tracking;
- Payout Pulse Scheduler;
- effective payout >= configured threshold;
- no stale candidate marked executable;
- API budget preserved for execution/reconciliation.

## Gate A5 — Strategy Runners
PASS requires:
- five strategy families implemented as isolated engines;
- strategy descriptions/limitations in UI;
- each accepted strategy-expiry profile independently validated;
- unsupported/failed profiles disabled;
- NO_SIGNAL first-class;
- no mandatory cross-strategy confluence;
- deterministic replay.

## Gate A6 — Risk / Concurrency
PASS requires:
- global simultaneous-order cap;
- max exposure/per-instrument limits;
- daily stop/optional target;
- loss-streak/cooldown controls;
- Loss Cascade Brake;
- atomic risk transitions;
- concurrency race tests;
- no cap breach in tests.

## Gate A7 — Demo Execution / Reconciliation
PASS requires:
- signal -> risk -> proposal refresh -> buy -> open -> settle lifecycle;
- idempotency;
- ambiguous-buy reconciliation before retry;
- restart recovery;
- Order Flight Recorder;
- zero untracked economic actions in test suite;
- demo only.

## Gate A8 — Dashboard / UX / Reports
PASS requires:
- UGAS-derived visual identity actually produced/integrated;
- Dashboard, Scanner, Strategies, Orders, Analytics, Risk, Reports, Settings, Admin, System Health;
- charts/KPIs/date filtering;
- multi-Runner status;
- PDF summary + CSV detail;
- responsive/accessibility states;
- alerts/notifications;
- Stop All/Kill accessible and authoritative.

## Gate A9 — Admin / Security / Operations
PASS requires:
- USER/ADMIN permissions;
- audited high-risk admin actions;
- no secret reveal path;
- localhost-first worker;
- system health;
- storage/quota/API pressure telemetry;
- fail-closed behavior on uncertain identity/risk/broker state.

## Gate A10 — Quant / Demo Acceptance
PASS is evaluated per Runner profile and for portfolio operation.
Required:
- OOS/walk-forward evidence;
- positive net expectancy with credible margin above break-even for any Runner labeled accepted;
- robustness/sensitivity;
- prospective proposal-aware evidence;
- demo/shadow validation;
- portfolio shared-slot/risk simulation;
- no unresolved CRITICAL/HIGH findings.

A strategy family may ship with fewer than three expiry profiles if rejected profiles are clearly disabled and product/docs reflect reality.

## Gate A11 — Release Evidence
PASS requires:
- complete acceptance matrix;
- exact-head CI green;
- evidence bundle;
- docs match implementation;
- zero unresolved CRITICAL/HIGH defects;
- checkpoint promotion;
- rollback/recovery instructions.

## V1 release verdict
APPROVED only if all gates applicable to V1 pass.
CORRECTION_REQUIRED if any required gate fails.
BLOCKED if canonical state/evidence cannot be trusted.

Live trading requires a separate future go-live program and is not implied by V1 approval.
