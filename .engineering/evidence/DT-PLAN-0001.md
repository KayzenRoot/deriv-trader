# Evidence Bundle · DT-PLAN-0001
Status: COLLECTING
Planning base: DT-CP-0003
Scope class: product/system planning only.

Latest clarifications incorporated:
- multiple concurrent Strategy Runners, each strategy + expiry;
- global Risk Engine / Order Slot Arbiter with hard simultaneous-order cap;
- Strategy Control Center and concurrency safety model;
- Quant Lab and deterministic backtester/replay plan;
- Runner-level acceptance for up to 15 strategy-expiry profiles;
- portfolio simulation of shared slot/risk effects without cross-strategy confluence.

Current Deriv documentation confirms public tick streaming/historical tick access and current proposal fields/compatibility considerations. Historical tick availability is treated as market-data evidence only; exact payout-aware expectancy requires captured proposal economics unless separately reconstructed and proven.

No implementation, credentials, trading or profitability claim.
Pending: further planning iterations, final consistency audit, governance CI, exact-head review and checkpoint delta.
