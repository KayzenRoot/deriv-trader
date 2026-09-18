# V1 Dependency Governance

## Rules
- prefer actively maintained, permissively licensed dependencies;
- minimize package count in trading-critical path;
- pin lockfile;
- run vulnerability audit in CI;
- document native/binary dependencies;
- no abandoned package in critical path without explicit exception;
- dependency upgrades require contract/regression tests;
- major upgrades are separate Work Orders when materially risky.

## Free-first
Only open-source libraries are required for core V1 runtime.
No paid SDK is mandatory.

## Supply-chain controls
- package-lock.json committed;
- clean install in CI;
- npm audit at high severity threshold;
- review install scripts/native addons;
- provenance/signature verification where practical;
- no package fetched from arbitrary git URL in production dependencies without review.

## Security patches
Critical/high fixes can trigger expedited dependency update PR but still require evidence and exact-head tests.
