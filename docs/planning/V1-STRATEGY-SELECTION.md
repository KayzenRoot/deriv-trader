# V1 Strategy Runner Selection Model

## Product rule
The V1 contains five strategy families. The user may start multiple independent Strategy Runners at the same time.

A Strategy Runner is uniquely defined by:
- strategy_id;
- expiry_profile: 60s, 180s or 300s.

Examples:
- Trend Pulse + 60s
- Trend Pulse + 180s
- Breakout Surge + 180s
- Anchor Pullback + 300s

Each Runner evaluates opportunities independently. No Runner must agree with another.

## UX contract
The Strategy screen shows five strategy cards. Inside each card the user sees supported expiry profiles, each with:
- 1m toggle/select;
- 3m toggle/select;
- 5m toggle/select;
- validation/availability status;
- short description;
- optional recent performance summary when enough evidence exists;
- Start/Stop status.

The screen supports:
- Start selected
- Stop selected
- Start all configured Runners
- Stop all
- individual Runner start/stop

## Execution invariant
MARKET SCANNER -> ELIGIBILITY/PAYOUT -> EACH ACTIVE RUNNER INDEPENDENTLY -> SIGNAL -> GLOBAL RISK/SLOT ARBITER -> BROKER SAFETY -> ORDER OR SKIP.

## No cross-strategy confluence
Other Runners do not confirm, veto, blend or average a signal.

## Research rule
Every strategy-expiry profile is validated independently. A failed 1m profile can be disabled while 3m/5m remain available.

## Duplicate protection
The same strategy + expiry combination may not be started twice in the same execution profile unless a future explicit feature introduces separately named variants.
