# Context Lock — DT-WP-02 DERIV DATA & SCANNER MODULE

Status: LOCKED_FOR_EXECUTION
Base checkpoint: DT-CP-0005
Canonical branch at compilation: main
Canonical truth: Git
Risk: HIGH_ASSURANCE

## Must read
1. .engineering/CHECKPOINT.md
2. .engineering/work-orders/DT-WP-02-DERIV-DATA-SCANNER.md
3. docs/development/WORK-PACKAGE-POLICY.md
4. docs/development/V1-WORK-PACKAGE-ROADMAP.md
5. docs/source-pack/DECISIONS.md
6. docs/source-pack/ARCHITECTURE.md
7. docs/source-pack/REQUIREMENTS.md
8. docs/source-pack/DEFINITION-OF-DONE.md
9. docs/planning/V1-DERIV-ADAPTER.md
10. docs/planning/V1-API-BUDGET-MANAGER.md
11. docs/planning/V1-API-CONTRACT-TESTS.md
12. docs/planning/V1-SCHEMA-DRIFT-GUARD.md
13. docs/planning/V1-DERIV-ERROR-TAXONOMY.md
14. docs/planning/V1-MARKET-DATA-PIPELINE.md
15. docs/planning/V1-SYMBOL-CONTRACT-REGISTRY.md
16. docs/planning/V1-PAYOUT-PULSE-SCHEDULER.md
17. docs/planning/V1-MARKET-FRESHNESS-MATRIX.md
18. docs/planning/V1-ELIGIBILITY-ENGINE.md
19. docs/planning/V1-SCANNER-RUNTIME.md
20. docs/planning/V1-SCANNER-TEST-MATRIX.md
21. docs/planning/V1-DATA-ARCHITECTURE.md
22. docs/planning/V1-DATA-CAPTURE.md
23. docs/planning/V1-PARQUET-LAYOUT.md
24. docs/planning/V1-DUCKDB-RESEARCH.md
25. docs/planning/V1-DATASET-MANIFEST.md
26. docs/planning/V1-DATA-QUALITY.md
27. docs/planning/V1-DATA-RECOVERY.md
28. docs/planning/V1-DATA-TEST-MATRIX.md
29. docs/planning/V1-DATASET-PROVENANCE.md
30. docs/planning/V1-RETENTION-COMPACTION.md
31. docs/planning/V1-REPOSITORY-ARCHITECTURE.md
32. docs/planning/V1-MODULE-DEPENDENCY-AUDIT.md

## Locked invariants
- build on DT-CP-0005 Foundation;
- current Deriv Options public API preferred;
- public/read-only broker integration only;
- no buy/sell/account/economic operation;
- no token/PAT/OAuth/OTP trading implementation required;
- one reused public WebSocket;
- no hard-coded tradable symbol universe;
- current schema normalization uses underlying_symbol family;
- proposals use actual ask_price/payout when present;
- missing/stale economics fail closed;
- default effective payout threshold 80%;
- 60/180/300-second capability must be proven, not guessed;
- API budgets are configurable and scanner preserves future execution reserve;
- Parquet + DuckDB local research plane;
- raw high-frequency data does not go into Supabase;
- deterministic CI must not depend on live broker availability;
- optional live public smoke is bounded and credential-free;
- web presentation boundary cannot import worker service internals;
- live money remains prohibited.

## Current official references verified at compilation
- https://developers.deriv.com/docs/options/ws-public/
- https://developers.deriv.com/docs/data/
- https://developers.deriv.com/docs/data/active-symbols/
- https://developers.deriv.com/docs/data/contracts-for/
- https://developers.deriv.com/docs/trading/proposal/
- https://developers.deriv.com/docs/subscription/forget/
- https://developers.deriv.com/docs/limits/
- https://developers.deriv.com/comparison/active-symbols/
- https://developers.deriv.com/comparison/contracts-for/
- https://developers.deriv.com/comparison/proposal/
- https://developers.deriv.com/comparison/ticks-history/
- https://duckdb.org/docs/lts/clients/node_neo/overview

## Executor judgment
Small free/open-source support dependencies are allowed when maintained, compatible with Node 24/TS6 and recorded in evidence.
Prefer @duckdb/node-api for DuckDB Node integration unless compatibility evidence requires another official/current DuckDB path.

## STOP
Use the Work Order STOP CONDITION.
