# V1 Payout Pulse Scheduler

Internal technology name: Payout Pulse Scheduler (PPS)

## Problem
The user wants all currently eligible instruments considered, but proposal/buy/sell/open-contract traffic shares a finite Deriv WebSocket request budget.

Current documented shared budget on 2026-09-18:
- proposal + proposal_open_contract + buy + sell: 360 requests/minute, 14,400/hour.

Deriv explicitly recommends subscription over polling, connection reuse, pacing and backoff.

## Goal
Maintain sufficiently fresh payout economics across the full eligible universe without exceeding API budgets or starving execution traffic.

## Key rule
Execution/reconciliation traffic outranks exploratory payout refresh traffic.

## Queues
Priority 0: order/reconciliation critical
Priority 1: proposal refresh for an already-valid strategy signal
Priority 2: eligible instruments near user payout threshold
Priority 3: routine payout freshness
Priority 4: cold/low-priority discovery

## Dynamic budget reserve
PPS never spends 100% of the shared proposal budget on scanning.
A configurable safety reserve is preserved for buy/open-contract/reconciliation operations.
The exact reserve percentage is measured/frozen in DT-API/DT-SCANNER testing rather than guessed.

## Adaptive refresh
Refresh cadence responds to:
- last observed effective payout;
- proximity to minimum payout threshold;
- payout volatility;
- active Runner demand;
- symbol/contract activity;
- current API-budget pressure;
- proposal freshness requirement.

## Subscription preference
Where current proposal subscription semantics safely provide the required economics, PPS prefers a managed subscription rather than repeated polling. Subscription cardinality and budget behavior are measured in sandbox/demo before freezing the implementation.

## Output
For each instrument + expiry/contract candidate:
- effective payout ratio;
- ask_price;
- payout;
- break-even probability;
- proposal id/reference;
- observed_at;
- expires/stale_at policy;
- freshness;
- source;
- eligibility reason.

## Safety
No multi-IP limit evasion, request spraying or undocumented bypass.
429/rate-limit/rejection responses trigger backoff and telemetry.
