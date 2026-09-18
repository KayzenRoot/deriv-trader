# V1 Strategy Validation Protocol

## Principle
The strategy is the product brain, so strategy acceptance has a higher evidence bar than UI completion.

## Independent evaluation
Each of the five strategies is evaluated independently and separately for 1m, 3m and 5m. This creates up to 15 strategy-expiry profiles. Any profile can be disabled without invalidating the others.

## Required stages
Research dataset freeze -> feature/label audit -> simple baseline -> parameter search on development folds -> nested/rolling walk-forward -> untouched OOS -> sensitivity/stress -> prospective data confirmation -> demo/shadow execution -> acceptance/rejection.

## Anti-overfit controls
- chronological splits;
- no future leakage;
- point-in-time features;
- bounded parameter search space;
- record every tested variant;
- compare against naive/random/directional baselines;
- multiple-testing awareness;
- parameter stability maps;
- reject knife-edge optima;
- no selecting only favorable symbols/months after seeing test results.

## Metrics
- trade count;
- hit rate with confidence interval;
- effective average payout;
- break-even probability;
- net expectancy/trade;
- maximum drawdown;
- longest loss sequence;
- profit factor where meaningful;
- Brier/log loss and calibration when probabilities are emitted;
- OOS degradation;
- performance by instrument/time/regime;
- payout sensitivity;
- proposal/latency sensitivity.

## Acceptance philosophy
No hard profit target is invented now. A profile must show positive OOS expectancy with a credible safety margin above payout break-even, reasonable stability, and demo confirmation. A high hit rate with poor payout economics is a failure.

## Research priors, not proof
Academic literature supports studying momentum, mean reversion and microstructure separately, but also shows substantial time variation, out-of-sample decay and cost sensitivity. Evidence from daily/monthly horizons cannot be transplanted to 1m/3m/5m.

## Stop rule
If a strategy-expiry profile fails robust validation, disable it rather than tuning indefinitely until it looks profitable.
