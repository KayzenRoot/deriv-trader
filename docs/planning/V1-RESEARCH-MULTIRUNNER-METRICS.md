# V1 Multi-Runner Research Metrics

## Why portfolio-level testing matters
Individual Runners are validated independently, but the product can run several at once. Therefore V1 also needs a portfolio simulation layer for shared risk/slot effects.

## Portfolio simulation must model
- user-selected active Runner set;
- global max simultaneous orders;
- fixed stake;
- per-instrument cap;
- signal collisions;
- slot exhaustion;
- daily stop/target;
- cooldowns;
- overlapping expiries;
- correlated losses across Runners.

## Metrics
- portfolio PnL/expectancy;
- slot utilization;
- signals blocked by slot cap;
- signals blocked by per-instrument cap;
- simultaneous exposure;
- worst overlapping-loss cluster;
- drawdown;
- strategy/expiry contribution;
- concentration by instrument/session;
- incremental contribution of each Runner.

## Important
Portfolio simulation must never alter the underlying strategy signals to create confluence. It only applies the same global risk/order-slot rules the product will use.
