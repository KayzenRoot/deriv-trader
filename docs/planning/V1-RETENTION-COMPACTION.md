# V1 Retention & Compaction

## Free-first objective
Keep local storage growth predictable and cloud usage small.

## Retention tiers
HOT:
- current/recent files actively used by scanner/research.

WARM:
- closed compressed Parquet partitions for recent research windows.

ARCHIVE:
- older immutable datasets optionally moved to cheaper/local secondary storage.

## Cloud retention
Supabase stores operational summaries/events needed by the product, not full raw market streams.

## Compaction
Small capture files are compacted into larger immutable Parquet partitions after they are safely closed.
Compaction:
- preserves logical row content;
- creates new hashes/manifests;
- verifies row counts/checksums;
- never mutates an acceptance dataset silently.

## User controls
V1 Settings/Admin may expose:
- local data directory;
- max local research storage target;
- retention days for optional raw payload evidence;
- manual cleanup of non-canonical exploratory caches.

Canonical acceptance evidence is protected from casual deletion until explicitly archived/retired.
