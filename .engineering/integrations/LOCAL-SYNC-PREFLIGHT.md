# Local GEF + Hive Synchronization Preflight
Purpose: first local executor pass on the user's Windows machine.

1. Clone/pull KayzenRoot/deriv-trader and verify main/checkpoint DT-CP-0001 or later.
2. Locate the stable GEF Bootstrap V1 source workspace/tag v1.0.0; run npm ci and npm run validate there. Do not use npm install -g gef-bootstrap.
3. Run hive-status. If unhealthy, use the installed Hive recovery/start command and re-check. Do not invent command output.
4. Verify Hive project registration/context for deriv-trader using the locally installed Hive V1 interface.
5. Confirm Codex/Cursor/Zcoder/other agents read this repo's AGENTS.md and checkpoint before mutation.
6. Test one read-only Hive context retrieval and one continuity/delta write if supported by the installed version.
7. Record exact command outputs, versions, local repo SHA and failures in .engineering/evidence/DT-HIVE-0001.md.
8. No Deriv credential is needed for this preflight.
9. STOP on secrets exposure, stale checkpoint conflict, unknown destructive migration or Hive/Git truth conflict.

Pass condition: GEF validates locally, Hive is healthy/reachable, agent context retrieval works, and Git remains canonical.