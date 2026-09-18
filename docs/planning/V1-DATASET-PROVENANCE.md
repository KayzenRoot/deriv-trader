# V1 Dataset & Provenance Contract

## Canonical datasets
1. Historical market dataset from official Deriv market-data endpoints.
2. Prospective tick stream capture.
3. Prospective proposal/payout capture.
4. Demo execution/reconciliation dataset.

## Required metadata
- symbol/instrument;
- source endpoint;
- collection timestamps;
- event timestamps;
- source/API version assumptions;
- raw payload hash where retained;
- parser/schema version;
- normalization version;
- missing/gap markers;
- dataset partition;
- Git SHA / collector version.

## Historical market data
Official Deriv ticks_history provides historical tick data and can support market-only signal replay. It does not automatically establish historical proposal/payout economics.

## Prospective payout data
Proposal snapshots must capture exact offered economics when fields are available, including ask_price and payout, plus contract parameters and freshness timestamps. Parser must handle current documented number|string representation and nullable/optional non-id fields safely.

## Data-quality gates
Reject/mark:
- duplicated events;
- non-monotonic timestamps;
- gaps beyond policy;
- schema mismatch;
- stale proposal;
- impossible prices;
- missing contract identity;
- clock-skew beyond tolerance.

## Partitions
Chronological train/development, validation, untouched test and rolling walk-forward folds. Final test data is never reused for iterative tuning.
