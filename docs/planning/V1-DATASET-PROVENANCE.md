# V1 Dataset & Provenance Contract

## Canonical datasets
1. official historical market data imports;
2. prospective tick stream capture;
3. prospective proposal/payout capture;
4. demo execution/reconciliation dataset;
5. derived feature/backtest datasets.

## Dataset Passport
Every acceptance-grade dataset has an immutable manifest with source, versions, files, hashes, time range, symbols, row counts, data-quality summary and Git SHA.

## Historical market data
Historical ticks can support signal replay but do not establish exact historical payout economics unless exact proposal data is separately captured/proven.

## Prospective payout data
Proposal snapshots capture actual ask_price/payout and contract metadata with timestamps/freshness.

## Data-quality gates
Duplicates, non-monotonic timestamps, gaps, schema mismatch, stale proposals, impossible values, identity gaps and clock skew are detected and classified.

## Partitions
Chronological development, validation, untouched test and rolling walk-forward folds. Final test data is never reused for iterative tuning.

## Evidence rule
Backtests without a Dataset Passport and DQG pass are exploratory only.
