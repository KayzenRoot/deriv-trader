# Hive V1 Integration Contract
Purpose: Codex, Cursor, Zcoder, Claude/other local coding agents use Hive for retrieval, continuity, delta context and memory while GEF governs work.
Precedence: Git canonical sources/exact-head evidence > Hive > conversation.
Expected local commands when installed: hive-status, hive-up, hive-dashboard, hive-down, hive-acp. Discover/verify actual local configuration; do not assume health.
Protocol: read AGENTS/checkpoint → health-check Hive → retrieve WO-relevant context → compile minimal context → execute bounded WO → persist useful continuity when supported → Evidence Bundle → exact-head audit → checkpoint only after approval.
Hive unavailable: record gap and continue from Git-native GEF sources when safe. Git/Hive conflict: Git wins. Stale/unknown checkpoint: fail closed. Never relax HIGH_ASSURANCE gates.