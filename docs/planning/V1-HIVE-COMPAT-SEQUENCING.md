# V1 Hive Compatibility Sequencing Decision

## Existing proven debts
DT-HIVE-0001 established:
1. Windows CRLF host worktree vs Linux Hive-container comparison creates a false project_worktree_dirty state, blocking capsule/delta context.
2. Hive checkpoint.read hard-codes docs/project-brain paths and does not resolve Deriv Trader's .engineering/CHECKPOINT.md + docs/source-pack layout.
3. Semantic/rerank retrieval is unavailable/disabled, but lexical retrieval and continuity memory work.

## Decision
Hive advanced-context compatibility is IMPORTANT but is NOT a blocker for starting Deriv Trader implementation because:
- Git remains canonical;
- GEF workflow is intact;
- Hive health/index/corpus/lexical retrieval/memory work;
- exact-head evidence remains available;
- the project has a documented Git-native fallback.

## Sequencing

### Deriv Trader first bootstrap
The first implementation bootstrap MUST add and validate an explicit repository line-ending policy (.gitattributes) suitable for Windows/Linux/container consistency.
This is a Deriv Trader repository hygiene fix and belongs in bootstrap evidence.

### Hive-side compatibility
DT-HIVE-COMPAT-0001 remains a separate Hive improvement Work Order for:
- EOL-tolerant/repository-canonical cleanliness inspection;
- configurable canonical checkpoint/source-pack paths;
- tests using a GEF/Source-Pack repository fixture.

It may be executed in parallel with early Deriv Trader development, but must be completed before we depend on Hive capsule/delta/checkpoint surfaces as mandatory development gates.

### Semantic retrieval
Semantic/rerank enablement remains non-blocking for V1 implementation. Lexical retrieval + Git-native GEF remain valid fallback. Revisit independently.

## Fail-closed rule
If Git canonical state and Hive disagree on substantive content/SHA, Git wins and advanced Hive output is not used until reconciled.

## Development implication
Do NOT delay the first Deriv Trader coding Work Order solely to modify Hive.
Do include .gitattributes/bootstrap EOL normalization in the first repository bootstrap increment.
