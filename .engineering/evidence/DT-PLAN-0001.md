# Evidence Bundle · DT-PLAN-0001
Status: COLLECTING
Planning base: DT-CP-0003
Scope class: product/system planning only.

Architecture planning now includes:
- user-owned operational data model and RLS boundaries;
- Local Worker Binding;
- modular-monolith local Trader Worker;
- versioned local HTTP + WebSocket/SSE contract;
- append-only domain event vocabulary;
- strict dependency direction between strategies, risk, execution, UI and broker adapter;
- startup/shutdown/crash-recovery fail-closed contract.

This keeps V1 fast to build while preserving future SaaS/hosted-worker migration paths.

No infrastructure provisioned, credentials handled or trading performed.
Pending: further planning iterations, final consistency audit, governance CI and exact-head review.
