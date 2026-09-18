# Agent Operating Contract
Deriv Trader uses GEF Bootstrap V1 governance and Hive V1 as the preferred local context/memory layer.

Source priority: CHECKPOINT → Decisions/ADRs → Scope → DoD → Architecture → Requirements → remaining sources.
Mandatory flow: ANALYZE → SOURCE CHECK → NEXT NECESSARY INCREMENT → WORK ORDER → CONTEXT LOCK → PREFLIGHT → EXECUTOR → TESTS/EVIDENCE → PR → EXACT-HEAD AUDIT → APPROVED/CORRECTION REQUIRED/BLOCKED → CHECKPOINT DELTA → MERGE → NEXT.
Git and exact-head evidence are canonical. Hive accelerates context but never overrides Git. No implementation without a Work Order. Never invent evidence. Money-moving/trading work is HIGH_ASSURANCE.
When Hive is locally available, health-check it and use only Work-Order-relevant retrieval/delta context. If unavailable, record the gap and use repository-native GEF context.