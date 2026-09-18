# V1 Strategy Control Center

## Purpose
The Strategy Control Center is the user-facing cockpit for configuring and running multiple Strategy Runners concurrently.

## Layout
Each of the five strategy families appears as a premium UGAS glass card with:
- strategy name;
- plain-language summary;
- supported validated expiries;
- 1m Runner toggle/status;
- 3m Runner toggle/status;
- 5m Runner toggle/status;
- recent evidence/performance badge when enough data exists;
- limitations / best-fit market conditions;
- Start / Stop actions.

## Global controls
Top-level controls:
- START ALL SELECTED;
- STOP ALL;
- PAUSE NEW ENTRIES;
- KILL SWITCH;
- global fixed stake;
- max simultaneous orders;
- payout threshold;
- per-instrument cap;
- daily stop;
- optional daily target.

## Runner states
STOPPED -> STARTING -> RUNNING -> PAUSED -> ERROR.
UI must show state transitions and reason codes.

## Example
Selected:
- Trend Pulse 1m
- Trend Pulse 3m
- Trend Pulse 5m
- Breakout Surge 3m
- Anchor Pullback 5m

Pressing START ALL activates five independent Runners.

## Live status per Runner
Show:
- status;
- instruments currently being evaluated;
- last signal time;
- signals today;
- orders today;
- wins/losses/PnL today;
- current blocker if any;
- last error if any;
- version/preset.

## UX safety
Runner start/stop never changes open order ownership. An already-open contract remains attributed to the Runner that created it.
