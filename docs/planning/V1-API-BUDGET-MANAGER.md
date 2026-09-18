# V1 API Budget Manager

## Goal
Treat Deriv request capacity as an explicit runtime resource.

## Current documented budgets
As of 2026-09-18:
- proposal + proposal_open_contract + buy + sell: 360/minute, 14,400/hour shared;
- balance + statement: 100/minute, 2,000/hour shared;
- portfolio + profit_table: 30/minute, 1,500/hour shared;
- other WebSocket calls: 220/minute, 14,400/hour;
- REST: IP and authenticated-account limits also apply.

These numbers are configuration/evidence inputs, not forever-hard-coded truths.

## Budget classes
CRITICAL_EXECUTION
RECONCILIATION
SIGNAL_PROPOSAL
MARKET_DISCOVERY
REPORTING
BACKGROUND

## Admission policy
Critical execution and reconciliation have reserved capacity.
Background/reporting traffic is throttled first.
Scanning cannot consume the reserve needed to buy/track open contracts.

## Telemetry
Expose:
- calls/minute by budget class;
- remaining estimated budget;
- rejection count;
- throttle count;
- queue depth;
- oldest queued non-economic request;
- reconnect count.

## Error behavior
Rate-limit responses do not trigger tight retry loops.
Backoff uses bounded exponential delay + jitter and honors endpoint semantics.

## No evasion
Never spread traffic across IPs/accounts to circumvent documented limits.
