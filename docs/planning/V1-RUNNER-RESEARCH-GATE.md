# V1 Runner Research Gate

## Unit of acceptance
Acceptance is per Runner profile, not merely per strategy family.

Examples:
- Trend Pulse 1m can be REJECTED while Trend Pulse 3m is ACCEPTED.
- Breakout Surge 5m can remain RETEST while Breakout Surge 3m is ENABLED.

## States
DRAFT -> RESEARCHING -> OOS_PASSED -> PROSPECTIVE_VALIDATION -> DEMO_VALIDATION -> ENABLED
Failure states: REJECTED / SUSPENDED / RETEST_REQUIRED.

## Minimum qualitative gate
A Runner cannot be ENABLED unless:
- no known leakage;
- OOS expectancy is positive with a credible margin above payout break-even;
- result is not dependent on one narrow period/instrument;
- parameter neighborhood is stable enough to avoid knife-edge tuning;
- payout/latency stress does not immediately destroy the edge;
- prospective/demo evidence is directionally consistent with research;
- CRITICAL/HIGH defects are zero.

## No fixed win-rate promise
The required hit rate depends on actual payout economics. Product acceptance is expectancy-based, not based on a universal target like 70%, 80% or 90%.

## Suspension
An enabled Runner can be automatically or administratively suspended later if live/demo monitoring detects drift, payout deterioration, data-quality issues or reconciliation anomalies.
