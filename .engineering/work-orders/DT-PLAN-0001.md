# Work Order DT-PLAN-0001

OBJECTIVE: Freeze a deliberately short Deriv Trader V1 product baseline before implementation.
CONTEXT: DT-CP-0003 planning-ready. User has defined visual direction, payout threshold, expiry targets, five individual strategy profiles, strong configurable risk, dashboard/admin and future micro-SaaS intent.
SCOPE: V1 product/modules/UX/risk/admin/scanner/strategy-selection baseline and build roadmap.
OUT OF SCOPE: coding, credentials, live money, strategy profitability claims, full SaaS billing/multi-tenancy.
FILES/SOURCES TO READ: canonical Source Pack; discovery docs; DT-HIVE evidence; current official Deriv API docs.
REQUIREMENTS: short V1; UGAS visual pipeline; all eligible instruments; payout >=80% default; 1m/3m/5m; exactly one active strategy; configurable risk; broker-limit compliance.
ARCHITECTURE RULES: deterministic gates; subscription/cache/backoff; Git canonical; HIGH_ASSURANCE.
CONSTRAINTS: API limits and contract availability are runtime/external facts; no assumptions promoted as evidence.
ACCEPTANCE CRITERIA: V1 master plan, modules, strategy selection/catalog, risk configuration, UI/UGAS brief, admin foundation, scanner budget model, roadmap and V1 DoD exist and are mutually consistent.
TESTS: governance/source consistency and exact-head review.
DELIVERABLES: planning pack only.
REVIEW FORMAT: APPROVED / CORRECTION REQUIRED / BLOCKED.
STOP CONDITION: no product implementation in DT-PLAN-0001.
