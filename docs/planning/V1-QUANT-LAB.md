# V1 Quant Lab

## Purpose
The Quant Lab is the research environment that decides which strategy-expiry Runners deserve to exist in the product.

Each Runner profile is evaluated independently:
- Trend Pulse 1m
- Trend Pulse 3m
- Trend Pulse 5m
- Mean Snapback 1m
- etc.

Up to 15 strategy-expiry profiles may exist in research, but only profiles that pass the evidence gate are enabled in the user product.

## Research workflow
Dataset snapshot -> feature generation -> strategy replay -> proposal/payout model -> result labeling -> metrics -> walk-forward/OOS -> sensitivity -> stress -> prospective capture -> demo/shadow evidence -> ACCEPT / REJECT / RETEST.

## Quant Lab outputs
For every Runner profile:
- strategy/version;
- expiry;
- dataset hash;
- time range;
- instruments included/excluded;
- trade count;
- win rate + confidence interval;
- average effective payout;
- break-even probability;
- net expectancy per trade;
- drawdown;
- longest loss streak;
- PnL distribution;
- performance by instrument/session/regime;
- sensitivity map;
- OOS degradation;
- acceptance verdict and reason.

## Product boundary
The Quant Lab is internal/research tooling. End users see only validated Runner profiles and understandable performance evidence, not unrestricted parameter mining tools.
