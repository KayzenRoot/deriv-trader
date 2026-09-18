# V1 Data Test Matrix

Mandatory scenarios:
1. tick stream -> normalized Parquet rows preserve timestamps/quotes;
2. proposal number|string fields normalize consistently;
3. duplicate events detected;
4. non-monotonic/gapped stream marked;
5. schema mismatch quarantines/blocks appropriately;
6. writer crash leaves recoverable/quarantinable partial file;
7. restart creates clean new capture continuation;
8. compaction preserves row count/content hashes;
9. Dataset Passport hashes exact partitions;
10. same manifest + code reproduces same research slice;
11. train/validation/test chronological partitioning has no overlap;
12. final test partition cannot be silently reused as training;
13. raw tick capture does not populate Supabase high-frequency tables;
14. cloud outage does not corrupt local capture;
15. disk-pressure threshold stops optional capture safely;
16. report/dashboard aggregates can be rebuilt from reconciled operational events;
17. proposal-aware dataset distinguishes missing payout evidence from known payout;
18. dataset with unresolved BLOCK_DATASET issue cannot become acceptance evidence.

Pass invariant:
No research result may be promoted as evidence without identifiable, quality-checked, immutable dataset provenance.
