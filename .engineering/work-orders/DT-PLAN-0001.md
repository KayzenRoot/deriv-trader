# Work Order DT-PLAN-0001

OBJECTIVE: Freeze a deliberately short, production-oriented Deriv Trader V1 product/system baseline before implementation.

CONTEXT: DT-CP-0003 planning-ready. Product direction evolved during governed planning to include multi-Runner execution, complete dashboard/reporting, per-user Deriv connections, local-first/free-first architecture, quantitative validation, operational data/research separation and future micro-SaaS ownership boundaries.

SCOPE: V1 product/modules/UX, multi-Runner strategy model, risk, scanner/market-data, Deriv adapter, auth/connections, data/research, demo execution, dashboard/reporting, admin/security, notifications, runtime/repository architecture, stack freeze, acceptance map and build roadmap.

OUT OF SCOPE: product coding, credentials, live money, unproven profitability claims, full billing, organizations/teams, hosted worker fleet and production commercial deployment.

FILES/SOURCES TO READ: canonical Source Pack; discovery docs; DT-HIVE evidence; current official Deriv API docs; current planning artifacts under docs/planning.

REQUIREMENTS:
- short LOCAL-FIRST / FREE-FIRST V1;
- UGAS visual pipeline;
- full currently eligible instrument universe;
- default effective payout >=80%;
- independently validated 1m/3m/5m Runner profiles;
- multiple concurrent Strategy Runners;
- configurable global simultaneous-order/risk controls;
- per-user Deriv connection;
- Supabase Auth identity;
- broker-limit compliance;
- deterministic/auditable demo execution;
- proposal-aware quantitative evidence;
- complete dashboard/reporting/admin/system-health UX.

ARCHITECTURE RULES: deterministic gates; shared subscriptions/caching/backoff; typed Deriv adapter; Git canonical; GEF governs; HIGH_ASSURANCE; no strategy/UI/research bypass of Risk/Execution authority.

CONSTRAINTS: API limits, contract availability, payout, schemas and free-tier quotas are runtime/external facts and must be re-verified rather than permanently assumed.

ACCEPTANCE CRITERIA: planning pack, Source Pack, decisions, DoD, architecture, build roadmap and end-to-end acceptance map are mutually consistent; stale single-strategy assumptions removed; exact-head planning audit passes; no product implementation occurs.

TESTS: source consistency audit; compare-to-main safety audit; governance checks; exact-head PR review.

DELIVERABLES: planning/governance pack only.

REVIEW FORMAT: APPROVED / CORRECTION REQUIRED / BLOCKED.

STOP CONDITION: DT-PLAN-0001 may close only after final consistency audit, PR exact-head review, successful merge and checkpoint promotion. No product implementation in this Work Order.
