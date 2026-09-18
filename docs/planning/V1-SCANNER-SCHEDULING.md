# V1 Scanner & API Budget Model

## Goal
Analyze every currently eligible instrument while respecting Deriv API budgets and avoiding account/platform abuse patterns.

## Current official constraints observed during planning
Deriv documents shared WebSocket budgets for proposal/proposal_open_contract/buy/sell and separate budgets for other calls. Limits may change, so runtime must discover/configure them and never assume today's numbers forever.

Planning reference on 2026-09-18:
- proposal + proposal_open_contract + buy + sell: 360/minute shared; 14,400/hour shared;
- other WebSocket calls: 220/minute; 14,400/hour;
- REST: IP/account budgets also apply.
Source: https://developers.deriv.com/docs/limits/

## V1 proprietary scheduling concept: Payout Pulse Scheduler
A small orchestration layer prioritizes quote/proposal refreshes without changing strategy logic.

Stages:
1. Active-symbol subscription/discovery.
2. Capability filter: only instruments supporting the requested contract/expiry family.
3. Market-data freshness cache.
4. Payout/proposal refresh queue.
5. Priority boosts for instruments close to or above the configured payout threshold.
6. Backoff for rejected/rate-limited calls.
7. Strategy evaluation only after data/proposal freshness requirements are satisfied.

## Fairness and completeness
"Analyze all eligible instruments" means every eligible instrument enters the scheduling universe. It does not mean querying every proposal every millisecond. The scheduler must provide bounded freshness and expose the age of each eligibility/payout snapshot.

## Safety
No rate-limit evasion, multi-IP circumvention or hidden browser automation. Connection reuse, subscriptions, caching, jitter and documented backoff are preferred.
