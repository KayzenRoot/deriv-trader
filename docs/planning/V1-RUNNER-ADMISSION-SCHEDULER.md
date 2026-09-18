# V1 Runner Admission Scheduler

## Goal
Resolve near-simultaneous valid signals fairly and deterministically without mixing strategy logic.

## Ordering
Primary key: signal-ready event timestamp.
Stable tie-breaker: runner_id + instrument + deterministic event sequence.

## No hidden profitability ranking in V1
The scheduler does not prefer the historically most profitable Runner unless a future separately researched policy proves and approves such prioritization.

## Admission
Each signal independently requests:
- risk approval;
- per-instrument exposure;
- global slot;
- fresh proposal/API budget.

If admitted, it proceeds immediately. If blocked because capacity is full, the signal expires/skips rather than entering a delayed execution queue.

## Fairness telemetry
Record per Runner:
- eligible signals;
- admitted signals;
- slot-cap blocks;
- risk blocks;
- API-budget blocks.
This lets analytics reveal whether one Runner systematically starves others.
