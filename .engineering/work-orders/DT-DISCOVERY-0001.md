# Work Order DT-DISCOVERY-0001
OBJECTIVE: Freeze the evidence-backed discovery boundary for Deriv Trader before implementation.
CONTEXT: DT-CP-0001 accepted. Project is GREENFIELD and HIGH_ASSURANCE.
SCOPE: official Deriv API capability map; data/auth/trading surfaces; research gates; payout/EV requirements; legal/regulatory risk flag; local Hive/GEF executor preflight; next architecture questions.
OUT OF SCOPE: credentials, account creation, live orders, strategy implementation, profitability claims, bypasses.
FILES/SOURCES TO READ: AGENTS.md; CHECKPOINT; Source Pack; HIVE-V1 contract; official Deriv API docs; CVM notice.
REQUIREMENTS: official-source-first; separate demo/real; preserve provenance; no inference presented as measured payout; live path blocked.
ARCHITECTURE RULES: Git truth > Hive > conversation; Deriv adapter boundary; deterministic research/execution; LLM outside order-time critical path.
CONSTRAINTS: local Hive health cannot be proven from GitHub environment.
ACCEPTANCE CRITERIA: discovery report identifies proven API capabilities, unknowns, research gates, regulatory constraint and next bounded increments.
TESTS: source consistency; governance workflow; exact-head audit.
DELIVERABLES: discovery report, research protocol, API capability matrix, local sync/preflight plan, evidence bundle.
REVIEW FORMAT: APPROVED / CORRECTION REQUIRED / BLOCKED.
STOP CONDITION: do not implement broker adapter or strategy code in this Work Order.