# V1 Data Recovery & Integrity

## Startup
- discover unfinished capture files;
- validate footer/format where applicable;
- quarantine corrupt/incomplete files;
- continue into a new file rather than appending unsafely to an ambiguous closed partition.

## Atomic writing
Use temporary/in-progress names then atomic rename/finalization where supported.

## Metadata
Operational DB tracks capture-session and finalized-partition metadata, but Parquet file content remains local canonical research evidence.

## Disk pressure
When free disk drops below configured thresholds:
- warn;
- stop optional historical backfills;
- reduce optional raw payload retention;
- if necessary stop research capture;
- never continue until disk exhaustion risks corrupting order/audit state.

## Backups
V1 does not require paid cloud backup.
Critical manifests/configs remain in Git/operational DB; research datasets can be copied to user-selected local/secondary storage.
