# V1 Strategy Engine Contract

## Independence invariant
Only the user-selected strategy executes. Other strategies are not consulted.

## Common input envelope
- instrument identity and current tradability;
- timestamped tick/derived-bar history with provenance;
- selected expiry candidate: 60s, 180s or 300s;
- current proposal economics and freshness;
- feature snapshot required by that strategy;
- strategy version;
- runtime configuration version.

## Common output
Every evaluation returns one of SIGNAL_CALL, SIGNAL_PUT or NO_SIGNAL plus:
- strategy_id/version;
- instrument;
- expiry;
- signal timestamp;
- feature snapshot hash;
- internal quality score;
- empirical probability estimate when calibrated;
- payout break-even probability;
- estimated edge when available;
- reason codes;
- no-trade reason when applicable.

## No-trade is a first-class outcome
Strategies must explicitly reject unsuitable regime, stale data, insufficient history, anomalous gaps/spikes, unsupported expiry and uncalibrated conditions.

## Internal multi-factor rule
A strategy may combine its own indicators/features. Example: Trend Pulse can require momentum, trend slope and volatility. That remains one strategy. Cross-strategy voting is forbidden in V1.

## Expiry profiles
The same strategy has independent 1m, 3m and 5m parameter/calibration profiles. No assumption that parameters transfer between horizons.

## Parameter governance
V1 ships versioned validated presets. Research parameters are not freely user-editable by default. User-facing control is kept to strategy selection, enabled expiries and execution/risk settings.

## Determinism
Given the same versioned strategy, inputs and configuration, replay must return the same decision.
