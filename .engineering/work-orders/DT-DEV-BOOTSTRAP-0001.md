# Work Order DT-DEV-BOOTSTRAP-0001

STATUS: APPROVED / CLOSED
WORK PACKAGE: DT-WP-01 — FOUNDATION MODULE
BASE CHECKPOINT: DT-CP-0004
PROMOTED CHECKPOINT: DT-CP-0005
RISK: HIGH_ASSURANCE

## Objective
Build the complete V1 foundation in one coherent implementation package so subsequent Work Packages can focus directly on Deriv/Data/Scanner, Quant/Strategies, Risk/Execution and Product UI.

## In scope
- synchronize local repository with canonical main;
- create governed implementation branch;
- enforce cross-platform line-ending policy;
- create npm-workspaces TypeScript monorepo;
- bootstrap apps/web and apps/trader;
- create all planned package boundaries/skeletons;
- pin compatible stack versions from V1-STACK-FREEZE.md and commit package-lock.json;
- configure strict TypeScript;
- configure lint/format/typecheck/test/build commands;
- create Fastify local Trader Worker with health endpoint and safe localhost default;
- create Next.js web shell with health/status integration stub;
- create domain/contracts/events/config/logging foundations;
- create Supabase client/auth/data-access skeleton without real credentials;
- create SecretStore interface and non-secret development adapter boundary;
- create local data-directory/config skeleton without implementing market capture;
- create environment validation and .env.example;
- create CI baseline;
- create architecture/dependency boundary checks where practical;
- create test fixtures and smoke tests;
- update README/developer bootstrap docs;
- generate exact evidence bundle.

## Explicitly out of scope
- real Deriv API implementation;
- trading strategies;
- scanner/payout engine;
- order execution;
- live money;
- broker credentials;
- actual Supabase project provisioning;
- UGAS production assets;
- final production UI.

## Required repository architecture
apps/web
apps/trader
packages/domain
packages/auth
packages/connections
packages/secret-store
packages/deriv-adapter
packages/market-data
packages/scanner
packages/strategies
packages/risk
packages/execution
packages/events
packages/db
packages/research
packages/reporting
packages/ui
packages/config
packages/testing

## Safety invariants
- no economic/broker order path;
- no secret committed;
- browser cannot own future broker secret authority;
- trading-critical authority remains in trader worker;
- research package has no economic side effects;
- local trader API binds loopback by default;
- no package dependency cycles;
- no unbounded latest dependency ranges;
- no weakening of governance files.

## Required validation
At minimum:
- clean install from lockfile;
- lint;
- typecheck;
- unit tests;
- build web;
- build trader/packages;
- smoke start trader/health;
- smoke start or build web;
- dependency-cycle check if implemented;
- npm audit at agreed high-severity threshold;
- git diff/status audit;
- governance workflow compatibility.

## Evidence
Create/update:
- .engineering/evidence/DT-DEV-BOOTSTRAP-0001.md

Evidence must record:
- base/main SHA;
- branch/head SHA;
- resolved dependency versions;
- commands executed;
- pass/fail results;
- known warnings;
- file/change summary;
- security audit result;
- any scope deviation.

## Review verdict
APPROVED / CORRECTION_REQUIRED / BLOCKED

## STOP CONDITION
SATISFIED by exact-head review d154126277ea4b58e750eb67d088a7a97d352559, green product/governance CI, squash merge PR #5 and DT-CP-0005 promotion.
