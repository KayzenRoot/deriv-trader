# V1 Schema Drift Guard

Internal technology name: Schema Drift Guard (SDG)

## Problem
Deriv documents active migration/breaking changes between legacy and new API schemas. V1 must not silently misread changed fields.

## Controls
1. Runtime schema validation at the adapter boundary.
2. Tolerant handling of documented optional/nullable fields.
3. Explicit normalization of known number|string fields where current docs permit them.
4. Unknown critical enum/state -> UNKNOWN_FAIL_CLOSED.
5. Fixture snapshots from documented/demo responses.
6. Contract tests against current public/demo API.
7. CI alert when fixtures/schema expectations change.

## Compatibility examples
- symbol vs underlying_symbol is normalized only inside the adapter;
- active-symbol display/pip field renames stay internal;
- proposal parsers cannot assume legacy response fields still exist.

## Drift evidence
Every runtime SCHEMA_MISMATCH records:
- endpoint/message type;
- safe payload shape metadata/hash;
- adapter version;
- build Git SHA;
- timestamp;
- parser error path.

No credentials are captured.
