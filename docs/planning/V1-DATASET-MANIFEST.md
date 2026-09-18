# V1 Dataset Manifest

Internal technology name: Dataset Passport

## Purpose
Make every research result traceable to the exact data used.

## Manifest fields
- dataset_id;
- dataset_version;
- created_at;
- collector version / Git SHA;
- parser/schema versions;
- source endpoints;
- environment;
- symbols;
- time range;
- partitions/files;
- file hashes;
- row counts;
- gap summary;
- anomaly summary;
- proposal coverage summary;
- compression/format metadata;
- parent dataset id when derived;
- immutable manifest hash.

## Derived datasets
Feature/training/test datasets include:
- parent Dataset Passport;
- transformation code SHA/version;
- parameters;
- partition policy;
- output hashes.

## Rule
A backtest without a Dataset Passport is exploratory only and cannot be acceptance evidence.
