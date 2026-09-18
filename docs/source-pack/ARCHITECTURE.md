# Architecture
Status: PROVISIONAL; runtime stack is not frozen.
Target components: Market Data; Dataset/Features; Backtest/Walk-Forward; Strategy/Regime; Payout/EV Gate; Risk; Broker Adapter; Execution/Reconciliation; Audit/Observability; Operator UI.
Governance plane: GEF V1. Context plane: Hive V1 when healthy. Truth plane: Git + exact-head evidence.
Hive is an adapter, not a hard dependency. Trading execution must be deterministic and must not depend on LLM output at order time unless separately designed/tested/approved.