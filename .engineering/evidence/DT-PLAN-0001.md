# Evidence Bundle · DT-PLAN-0001
Status: COLLECTING
Planning base: DT-CP-0003
Scope class: product/system planning only.

Latest product clarification incorporated: V1 supports multiple concurrent Strategy Runners. A Runner is one strategy + one independently validated 1m/3m/5m expiry profile. Users may start combinations such as the same strategy at 1m/3m/5m plus other strategies at other expiries. No confluence is required.

All Runners share the global Risk Engine and Order Slot Arbiter. User-configured max simultaneous orders is a hard system-wide cap. Signals arriving while the cap is full are skipped/expired and require fresh re-evaluation after a slot becomes available.

No implementation, credentials, trading or profitability claim.
Pending: further planning iterations, final consistency audit, governance CI, exact-head review and checkpoint delta.
