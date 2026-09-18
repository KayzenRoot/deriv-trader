# DT Checkpoint
Checkpoint: DT-CP-0005
Date: 2026-09-18
Mode: GREENFIELD
Risk: HIGH_ASSURANCE
GEF baseline: V1.0.0 governance model
State: FOUNDATION_ACCEPTED_READY_FOR_DERIV_DATA_SCANNER

## Accepted evidence
- DT-CP-0001 bootstrap accepted.
- DT-CP-0002 discovery accepted.
- DT-CP-0003 local preflight/planning-ready accepted.
- DT-CP-0004 planning baseline accepted.
- DT-WP-01 / DT-DEV-BOOTSTRAP-0001 PR #5 exact audited head: d154126277ea4b58e750eb67d088a7a97d352559.
- Product workflow PR run #8: SUCCESS.
- Governance workflow PR run #18: SUCCESS.
- Exact-head COMMENT review id: 5252676948.
- Squash merge SHA: 9003ed5b9b70b234b5c1a2372679a6fb17ce81a7.
- Final compare before merge: 5 commits ahead, 0 behind; 98 changed files; 0 deletions.
- CRITICAL/HIGH unresolved Foundation findings: 0.

## Foundation accepted
- npm-workspaces TypeScript monorepo.
- Node 24 LTS / npm 11.x engine policy.
- Next.js 16.3.x Active LTS/security line reconciled.
- React 19.2.x, Tailwind 4.3.x, Motion 13.x, ECharts 6.1.x.
- Fastify trader worker, loopback-only by default.
- Supabase/Auth/DB/SecretStore skeleton boundaries.
- Domain/events/config/testing foundations.
- All planned package boundaries scaffolded.
- Explicit package dependency allowlist + negative self-tests.
- Cycle check.
- Cross-platform .gitattributes/.editorconfig EOL policy.
- Clean typed lint on Ubuntu without prebuilt dist artifacts.
- Unit tests/builds/web production build/trader health smoke.
- npm audit high-severity gate green.
- Product + governance CI green.
- Current Deriv Options API REST/public-WS endpoints represented in config only, with no live network/trading implementation.
- No broker economic path.
- No real credentials.
- No live-money execution.

## Architecture invariants retained
- LOCAL-FIRST / FREE-FIRST / modular-monolith-first.
- Web remains presentation/client boundary and cannot import worker economic/service modules directly.
- Trader Worker remains trading authority boundary.
- Strategies cannot execute broker orders.
- Risk remains mandatory and centralized.
- Research has no economic authority.
- Git remains canonical over Hive.

## Still unproven
- Real Deriv runtime adapter behavior.
- Active-symbol/contracts/tick/proposal normalization against current API.
- API budget behavior under load.
- Prospective tick/proposal capture.
- Parquet/DuckDB runtime pipeline.
- Scanner/Payout Pulse/Market Freshness operation.
- Any strategy edge/profitability.
- Demo execution/reconciliation.
- Live-money execution.

## Next legal increment
DT-WP-02 — DERIV DATA & SCANNER MODULE.

Live-money remains blocked.
