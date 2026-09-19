# Context Lock — DT-WP-03 QUANT & STRATEGY ENGINE MODULE

Status: LOCKED_FOR_EXECUTION
Base checkpoint: DT-CP-0006
Canonical branch at compilation: main
Canonical truth: Git
Risk: HIGH_ASSURANCE

## Must read
1. .engineering/CHECKPOINT.md
2. .engineering/work-orders/DT-WP-03-QUANT-STRATEGY.md
3. docs/development/WORK-PACKAGE-POLICY.md
4. docs/development/V1-WORK-PACKAGE-ROADMAP.md
5. docs/source-pack/DECISIONS.md
6. docs/source-pack/ARCHITECTURE.md
7. docs/source-pack/REQUIREMENTS.md
8. docs/source-pack/DEFINITION-OF-DONE.md
9. docs/planning/V1-QUANT-LAB.md
10. docs/planning/V1-BACKTEST-ENGINE.md
11. docs/planning/V1-DATASET-PROVENANCE.md
12. docs/planning/V1-RUNNER-RESEARCH-GATE.md
13. docs/planning/V1-RESEARCH-MULTIRUNNER-METRICS.md
14. docs/planning/V1-STRATEGY-ENGINE-CONTRACT.md
15. docs/planning/V1-STRATEGY-CATALOG.md
16. docs/planning/V1-SCANNER-RUNTIME.md
17. docs/planning/V1-ELIGIBILITY-ENGINE.md
18. docs/planning/V1-RUNNER-ADMISSION-SCHEDULER.md
19. docs/planning/V1-DATA-ARCHITECTURE.md
20. docs/planning/V1-DATASET-MANIFEST.md
21. docs/planning/V1-DATA-QUALITY.md
22. .engineering/evidence/DT-WP-02-DERIV-DATA-SCANNER.md

## Locked invariants
- five independent strategy families;
- 60/180/300-second Runner profiles are separate research units;
- no cross-strategy voting/confluence;
- no strategy may import Deriv adapter, risk or execution authority;
- NO_SIGNAL is first-class;
- stale/gapped/untrusted/insufficient input => NO_SIGNAL;
- Dataset Passport + DQG required for acceptance-grade research;
- market-only historical replay cannot claim exact historical payout;
- proposal-aware evidence may use only proposal snapshots available at decision time;
- no lookahead;
- final test cannot be tuned against;
- deterministic seeds/config hashes/manifests;
- payout-aware Edge Gate uses actual ask/payout economics;
- p_hat only when leakage-safe calibrated;
- no universal win-rate target;
- strategy quality score is not a probability unless calibrated;
- no profile may be ENABLED in WP-03;
- no buy/sell/demo execution/live money.

## Permitted implementation judgment
- small maintained open-source numerical/statistical packages may be added when clearly useful, free/open-source, Node 24/TS6 compatible and recorded in evidence;
- prefer simple transparent implementations over heavy ML stacks;
- reasonable seed parameter ranges may be defined for research, but they remain unvalidated until evidence;
- if real captured proposal-aware history is insufficient, preserve honest RETEST_REQUIRED/PROSPECTIVE_VALIDATION instead of fabricating acceptance.

## Source precedence
Checkpoint -> Decisions -> Scope -> DoD -> Architecture -> Requirements -> planning docs -> evidence.

## STOP
Use Work Order STOP CONDITION.
