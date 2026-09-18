# Architecture
Status: V1 PLANNING BASELINE; runtime stack still pending DT-ARCH-0001.

Core planes/components:
1. Market/API Adapter
2. Eligibility + Proposal/Payout Cache
3. Market Scanner
4. Single Active Strategy Runtime
5. Global Risk & Broker-Safety Gate
6. Demo Execution + Reconciliation
7. Dataset/Research/Replay
8. Audit & Observability
9. Operator UI
10. Admin/SaaS Foundation

Execution path: active symbols/capabilities -> cached/subscribed market state -> eligibility/payout filter -> selected strategy only -> global risk/broker gates -> demo order or skip -> reconciliation/audit.

Current Deriv API design must favor subscriptions, connection reuse, pacing and backoff over aggressive polling. Rate limits are external constraints and must remain configuration/discovery driven rather than hard-coded assumptions.

Governance plane: GEF. Context plane: Hive when healthy. Truth plane: Git + exact-head evidence. LLM output is outside deterministic order-time decision authority unless a future separately approved architecture changes that.