# V1 Scanner Runtime

## Definition
The scanner is not one giant loop that polls every symbol.

It is a live state machine consuming:
- Symbol Registry;
- Contract Registry;
- shared tick streams;
- Payout Pulse state;
- Market Freshness Matrix;
- active Runner requirements.

## Scanner output
A continuously maintained Opportunity Lattice:
- instrument
- Runner/expiry compatibility
- effective payout
- freshness
- eligibility
- latest market-state summary
- active Runner demand

Internal technology name: Opportunity Lattice.

## Runner interaction
Each active Runner subscribes internally to eligible state changes for its expiry profile.
When an instrument becomes eligible/fresh, the Runner evaluates its own strategy.
When payout drops below threshold or state becomes stale, the Runner receives an ineligibility transition.

## Scaling rule
Complexity should grow roughly with unique symbols/data dependencies, not Runner count x symbols through duplicated external calls.

## Start All
Starting many Runners reuses existing shared market state. It does not open redundant external tick subscriptions per Runner.
