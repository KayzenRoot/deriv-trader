# Evidence Bundle · DT-PLAN-0001
Status: COLLECTING
Planning base: DT-CP-0003
Scope class: product/system planning only.

Latest product clarification incorporated: V1 supports multiple concurrent Strategy Runners, each one strategy + one expiry. User can select combinations across the five strategies and 1m/3m/5m profiles, then Start All.

A global Risk Engine and Order Slot Arbiter enforce fixed stake/risk settings and a hard max_simultaneous_orders across every Runner. Stale blocked signals are never blindly queued. Concurrency test requirements now explicitly cover simultaneous signals, slot exhaustion, same-instrument collisions, stop/kill races, API rejection, restart and idempotent duplicate starts.

UI planning now includes a dedicated Strategy Control Center and dashboard/reporting attribution by Runner.

No implementation, credentials, trading or profitability claim.
Pending: further planning iterations, final consistency audit, governance CI, exact-head review and checkpoint delta.
