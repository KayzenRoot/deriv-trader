# V1 DuckDB Research Layer

## Role
DuckDB is the local analytical/query engine over Parquet datasets.

## Uses
- historical scans;
- feature generation;
- backtests;
- walk-forward slicing;
- payout distribution studies;
- dashboard/report precomputation for local research;
- dataset QA;
- schema inspection.

## Boundary
DuckDB is NOT the live order-state authority.

The Trader Worker may write capture files and lightweight metadata, while Quant Lab opens immutable/closed partitions for analysis.

## Reproducibility
Research queries/jobs bind:
- dataset manifest id;
- Git SHA;
- strategy/preset version;
- feature version;
- query/job config;
- random seed where relevant.

## Export
Quant results may be exported to compact Parquet/CSV summaries and referenced from the operational database without copying all raw data into Supabase.
