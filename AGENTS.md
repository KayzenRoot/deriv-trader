# Agent Operating Contract
Deriv Trader uses GEF Bootstrap V1 governance and Hive V1 as the preferred local context/memory layer.

Source priority: CHECKPOINT → Decisions/ADRs → Scope → DoD → Architecture → Requirements → remaining sources.
Mandatory flow: ANALYZE → SOURCE CHECK → NEXT NECESSARY INCREMENT → WORK ORDER → CONTEXT LOCK → PREFLIGHT → EXECUTOR → TESTS/EVIDENCE → PR → EXACT-HEAD AUDIT → APPROVED/CORRECTION REQUIRED/BLOCKED → CHECKPOINT DELTA → MERGE → NEXT.
Git and exact-head evidence are canonical. Hive accelerates context but never overrides Git. No implementation without a Work Order. Never invent evidence. Money-moving/trading work is HIGH_ASSURANCE.
When Hive is locally available, health-check it and use only Work-Order-relevant retrieval/delta context. If unavailable, record the gap and use repository-native GEF context.

## Agent skills

### Matt Pocock skill invocation

When the `mattpocock-skills` plugin is available, automatically use a model-invoked skill whose description matches the current task; these skills do not require the user to type a slash command. Use `/ask-matt` when skill routing is unclear. User-invoked workflows remain user-led. Do not force-fit a skill or let it override the user's request, this repository's governance/security rules, or deterministic evidence.

Prefer deterministic Git, text search, AST, hashes, tests, lint, typecheck, and build checks whenever they are sufficient. Use Jev only when available and useful for bounded context relevance, triage, classification, reranking, claim verification, comparison, or explicit-gate decisions. Jev output is advisory; never send it secrets or credentials.

### Issue tracker

Issues and specs for this repository live in GitHub Issues. Use the `gh` CLI and follow `docs/agents/issue-tracker.md`.

### Triage labels

Use `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, and `wontfix` for the five canonical triage roles. Follow `docs/agents/triage-labels.md`.

### Domain docs

This repository uses a single-context domain layout. Read relevant glossary and ADR material before domain changes; follow the actual paths recorded in `docs/agents/domain.md`.
