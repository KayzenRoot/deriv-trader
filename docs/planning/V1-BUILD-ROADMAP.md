# V1 Short Build Roadmap

Principle: smallest governed sequence that produces a credible, testable demo product quickly.

1. DT-DEV-BOOTSTRAP-0001 — frozen monorepo skeleton, Node/Next/TS baseline, .gitattributes, CI, local dev/bootstrap and package boundaries.
2. DT-UX-0001 — UGAS identity/design system and core screen asset handoff.
3. DT-ARCH-0001 — finalize runtime/data module contracts in code from the frozen architecture.
4. DT-API-0001 — Deriv adapter, connections, active symbols, ticks, proposal/capability contracts, pacing/backoff.
5. DT-DATA-0001 — provenance-first market/proposal capture, Parquet/DuckDB and replay fixtures.
6. DT-RISK-0001 — configurable global Risk Engine and concurrency controls.
7. DT-STRAT-0001 — five independent strategy families + Runner research/test harness.
8. DT-SCANNER-0001 — all-eligible-instrument scanner + Payout Pulse Scheduler.
9. DT-EXEC-DEMO-0001 — demo execution, idempotency and reconciliation.
10. DT-DASH-0001 — complete dashboard, settings, analytics, reports and Strategy Control Center.
11. DT-ADMIN-0001 — admin/SaaS-ready foundation.
12. DT-V1-INTEGRATION-0001 — end-to-end integration, performance, security and regression.
13. DT-V1-ACCEPTANCE-0001 — exact-head acceptance, quant/demo evidence and release checkpoint.

Parallelizable after bootstrap/architecture boundaries: UX asset production, risk internals, data capture groundwork and admin shell. Strategy acceptance remains independent per Runner profile.
