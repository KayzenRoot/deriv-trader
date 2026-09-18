# V1 Market Eligibility Engine

## Purpose
Convert raw symbol, contract, payout and user configuration state into a deterministic eligible universe.

## Eligibility checks
An opportunity candidate is eligible only when:
1. symbol is currently active;
2. required contract type is available;
3. selected Runner expiry (60/180/300s) is supported;
4. live tick stream is fresh;
5. proposal economics are fresh enough;
6. effective net payout meets user threshold, default >=80%;
7. instrument is not blocked by user allow/block settings;
8. operating-window rules allow evaluation;
9. Deriv/API capability state is healthy.

## Output state
ELIGIBLE
PAYOUT_TOO_LOW
UNSUPPORTED_EXPIRY
UNSUPPORTED_CONTRACT
MARKET_INACTIVE
TICK_STALE
PROPOSAL_STALE
USER_BLOCKED
API_DEGRADED
UNKNOWN_FAIL_CLOSED

## Important distinction
Eligibility says whether a Runner is allowed to evaluate/act on the instrument. It does not mean the strategy has a valid trading signal.

## Effective payout
Eligibility uses actual proposal economics:
r = (payout - ask_price) / ask_price.
Default threshold: r >= 0.80.

No marketing/display payout label can override the normalized economics.
