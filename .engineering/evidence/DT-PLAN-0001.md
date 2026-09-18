# Evidence Bundle · DT-PLAN-0001
Status: COLLECTING
Planning base: DT-CP-0003
Scope class: product/system planning only.

Latest planning block completes architecture/version freeze and dependency audit.

Current official sources were checked on 2026-09-18. V1 deliberately selects stable/mature lines rather than every newest release:
- Node 24 LTS;
- Next 16.2 Active LTS;
- React 19.2 line;
- Tailwind 4.3;
- Fastify 5.12;
- Motion 13;
- ECharts 6.1;
- Vitest 5;
- Playwright 1.55;
- DuckDB 1.5.5;
- Supabase JS 2.x.

Exact patches are resolved/locked during bootstrap and then governed by lockfile + CI.

Module dependency rules explicitly prevent strategies/UI/research/admin from bypassing broker/risk/security boundaries.

No infrastructure provisioned, credentials handled or trading performed.
Pending: end-to-end acceptance/DoD consistency, Hive compatibility sequencing and final planning audit/PR/checkpoint.
