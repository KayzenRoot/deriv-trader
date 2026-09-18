# V1 Parquet Layout

## Goal
Efficient local storage, partition pruning and reproducible dataset snapshots.

## Proposed root
data/
  raw/
  normalized/
  proposals/
  executions/
  research/
  manifests/

## Suggested partitioning

### ticks
normalized/ticks/
  date=YYYY-MM-DD/
  symbol=<normalized_symbol>/
  part-*.parquet

### proposals
proposals/
  date=YYYY-MM-DD/
  symbol=<normalized_symbol>/
  expiry_s=<60|180|300>/
  part-*.parquet

### executions
executions/
  environment=<demo|real>/
  date=YYYY-MM-DD/
  part-*.parquet

## File sizing
Avoid one tiny file per event. Writers buffer bounded batches and roll files by size/time.

Exact row-group/file-size targets are benchmarked during DT-DATA-0001 rather than guessed.

## Compression
Use a broadly supported Parquet compression codec chosen by benchmark at implementation time. Compression choice is recorded in dataset manifests.

## Immutability
Closed dataset partitions are treated as immutable evidence. Corrections produce new dataset versions/manifests rather than silent in-place mutation.
