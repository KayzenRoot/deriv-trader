# Research Protocol v0.1
Risk: HIGH_ASSURANCE

## Primary objective
Test whether any strategy has stable positive net expectancy after offered contract economics, not whether it can produce an attractive in-sample win rate.

## Data partitions
Chronological development/training, validation, untouched test and rolling walk-forward windows. Never random-shuffle time series for final evidence.

## Required anti-bias controls
No future leakage; point-in-time features; frozen transformations per fold; duplicate/event overlap controls; explicit missing-data policy; parameter-search accounting; multiple-testing awareness; baseline comparisons.

## Metrics
Net expectancy/trade; break-even probability; calibrated Brier/log loss where probabilistic models are used; win rate; average offered payout; max drawdown; profit factor; Sharpe/Sortino where meaningful; longest loss sequence; regime/session stability; OOS degradation; parameter sensitivity.

## Minimum evidence before demo strategy promotion
Statistically meaningful trade count across multiple regimes; positive OOS expectancy with uncertainty bounds; no single month/session/regime carrying the result; robustness to worse payout/latency assumptions; reproducible run manifest tied to dataset hash and Git SHA.

No numeric threshold is frozen until prospective payout/data characteristics are measured.