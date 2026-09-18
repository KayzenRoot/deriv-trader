# Evidence Bundle · DT-PLAN-0001
Status: COLLECTING
Planning base: DT-CP-0003
Scope class: product/system planning only.

Market-data/scanner planning updated against current official Deriv documentation on 2026-09-18.

Verified current facts:
- active_symbols is public/no-auth and returns current active underlying markets;
- contracts_for is public/no-auth and returns contracts available for a symbol;
- ticks supports live per-symbol subscriptions;
- ticks_history supports historical market data;
- proposal is public/no-auth for pricing/proposal flow;
- current WebSocket shared budget for proposal + proposal_open_contract + buy + sell is 360/minute and 14,400/hour;
- all other WebSocket calls are currently documented at 220/minute and 14,400/hour;
- Deriv recommends subscriptions over polling, connection reuse, burst control and backoff;
- current new API renamed legacy symbol fields/parameters to underlying_symbol in key endpoints and has documented breaking changes.

Planning artifacts now specify a shared Market Data Pipeline, Symbol/Contract Registry, Market Freshness Matrix, Payout Pulse Scheduler, Opportunity Lattice, Connection Supervisor and scanner test matrix.

No infrastructure provisioned, credentials handled or trading performed.
Pending: further planning iterations, final consistency audit, governance CI and exact-head review.
