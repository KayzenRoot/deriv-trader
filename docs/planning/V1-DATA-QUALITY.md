# V1 Data Quality Engine

Internal technology name: Data Quality Gate (DQG)

## Checks
- duplicate event ids / duplicate timestamps+payload fingerprints;
- non-monotonic time;
- impossible quote values;
- excessive gaps;
- receive/event clock skew;
- malformed proposal economics;
- missing contract/expiry identity;
- schema drift;
- inconsistent precision;
- abrupt collector discontinuity;
- partition overlap.

## Severity
INFO
WARN
BLOCK_DATASET
BLOCK_TRADING_INPUT

## Trading path
Live input checks are lightweight and bounded.
Critical stale/gap/schema failures can mark an instrument UNTRUSTED and block execution.

## Research path
Full dataset QA runs before a dataset can be promoted to research/acceptance evidence.

## Output
Every Dataset Passport includes a DQG summary and unresolved issues.
