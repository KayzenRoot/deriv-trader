# Context Lock — DT-PLAN-0001

Status: FINAL_AUDIT_LOCK
Branch: planning/DT-PLAN-0001
Base checkpoint: DT-CP-0003
Risk class: HIGH_ASSURANCE
Canonical truth: Git

## Source precedence
1. .engineering/CHECKPOINT.md
2. docs/source-pack/DECISIONS.md
3. docs/source-pack/SCOPE.md
4. docs/source-pack/DEFINITION-OF-DONE.md
5. docs/source-pack/ARCHITECTURE.md
6. docs/source-pack/REQUIREMENTS.md
7. docs/planning/*
8. .engineering/evidence/*

## Locked product invariants
- multiple concurrent Strategy Runners;
- one Runner = one strategy family + one expiry profile;
- no mandatory cross-strategy confluence;
- global Risk Engine / Order Slot Arbiter;
- default effective payout threshold 80%;
- 1m/3m/5m only where independently validated and broker-supported;
- per-user Deriv connection;
- Supabase Auth user identity;
- LOCAL-FIRST / FREE-FIRST V1;
- demo/paper before live;
- live-money excluded from V1;
- UGAS owns original brand/visual asset production;
- Git remains canonical over Hive.

## Allowed final-audit mutations
Only planning/governance consistency corrections, evidence updates, PR/review/checkpoint metadata and no product implementation.

## Stop condition
Final audit green, exact-head PR review recorded, merged planning baseline promoted to checkpoint.
