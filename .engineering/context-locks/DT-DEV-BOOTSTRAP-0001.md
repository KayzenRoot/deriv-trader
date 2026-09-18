# Context Lock — DT-DEV-BOOTSTRAP-0001

Status: LOCKED_FOR_EXECUTION
Base checkpoint: DT-CP-0004
Canonical branch at compilation: main
Canonical truth: Git
Risk: HIGH_ASSURANCE

## Must read before implementation
1. .engineering/CHECKPOINT.md
2. .engineering/work-orders/DT-DEV-BOOTSTRAP-0001.md
3. docs/development/WORK-PACKAGE-POLICY.md
4. docs/source-pack/DECISIONS.md
5. docs/source-pack/ARCHITECTURE.md
6. docs/source-pack/REQUIREMENTS.md
7. docs/source-pack/DEFINITION-OF-DONE.md
8. docs/planning/V1-STACK-FREEZE.md
9. docs/planning/V1-REPOSITORY-ARCHITECTURE.md
10. docs/planning/V1-MODULE-DEPENDENCY-AUDIT.md
11. docs/planning/V1-STARTUP-SHUTDOWN.md
12. docs/planning/V1-SECURITY-BOUNDARIES.md
13. docs/planning/V1-FREE-FIRST-ARCHITECTURE.md
14. docs/planning/V1-HIVE-COMPAT-SEQUENCING.md

## Locked constraints
- LOCAL-FIRST / FREE-FIRST;
- modular monolith;
- Node 24 LTS line;
- stable frozen stack lines from V1-STACK-FREEZE.md;
- npm workspaces;
- TypeScript strict;
- local trader worker is trading authority boundary;
- web/UI cannot directly own broker execution;
- Supabase is skeleton only, no credentials/provisioning required;
- explicit .gitattributes line-ending policy is mandatory;
- live money forbidden;
- Deriv order/execution implementation forbidden in this Work Package;
- exact compatible patch versions are resolved and lockfile-pinned during execution.

## Permitted executor judgment
The executor may choose small maintained open-source support libraries needed to complete the Foundation Module when:
- they are free/open source;
- they do not contradict frozen architecture;
- their purpose and version are recorded in evidence;
- they do not create a paid-service dependency.

## Stop
Use the Work Order STOP CONDITION.
