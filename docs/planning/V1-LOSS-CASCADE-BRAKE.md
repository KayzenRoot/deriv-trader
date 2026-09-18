# V1 Loss Cascade Brake

Internal technology name: Loss Cascade Brake (LCB)

## Problem
Several Runners can independently look valid while actually responding to the same hostile market regime. Losses may then cluster across strategies and expiries.

## Goal
Reduce cascading losses without introducing cross-strategy confluence.

## Inputs
The LCB observes portfolio-level outcomes only:
- recent realized losses;
- loss clustering in time;
- simultaneous losing exposure;
- repeated losses on the same instrument;
- repeated losses across correlated Runner families where evidence supports grouping;
- current drawdown;
- volatility/data-quality anomalies.

## Actions
Configurable graduated responses:
NORMAL -> CAUTION -> THROTTLED -> PAUSED.

Possible actions:
- temporary increase in cooldown;
- reduce new admission rate;
- temporarily reduce available global slots;
- block repeated exposure to one instrument;
- pause new entries when configured hard thresholds are reached.

## Important boundary
LCB does NOT combine strategy signals and does not decide direction. It only regulates risk/admission.

## Recovery
Recovery requires a deterministic cooldown/recovery policy and fresh acceptable system state. No immediate oscillation between PAUSED and RUNNING.
