# V1 Strategy Engine Contract

## Independence invariant
Each active Strategy Runner executes independently. Other Runners are not consulted for confirmation or veto.

## Runner identity
runner_id = strategy_id + expiry_profile + execution_profile identity.

## Common input envelope
- instrument identity/tradability;
- timestamped market history with provenance;
- Runner expiry: exactly 60s, 180s or 300s;
- current proposal economics/freshness;
- strategy-specific feature snapshot;
- strategy/preset version;
- runtime configuration version.

## Common output
Every evaluation returns SIGNAL_CALL, SIGNAL_PUT or NO_SIGNAL plus strategy_id/version, runner_id, instrument, expiry, timestamp, feature snapshot hash, internal quality, empirical probability when calibrated, payout break-even, estimated edge and reason codes.

## No-trade
Strategies reject unsuitable regime, stale data, insufficient history, anomalous gaps/spikes, unsupported expiry and uncalibrated conditions.

## Internal multi-factor rule
A Runner may combine factors inside its own strategy. Cross-strategy voting remains forbidden.

## Expiry profiles
1m, 3m and 5m are separate strategy profiles with separate validation and versions.

## Parameter governance
V1 ships versioned validated presets. Users select/start Runners and control execution/risk settings; raw research parameters are not broadly exposed.

## Determinism
Same strategy version + Runner profile + inputs + config must replay to the same decision.
