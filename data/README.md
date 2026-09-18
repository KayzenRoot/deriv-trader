# Local data directory policy (DT-WP-01 Phase G)

- `data/` is the local-first research/runtime root.
- Only `.gitkeep` and this policy file are committed.
- Runtime artifacts (`*.parquet`, `*.duckdb`, `*.db`, `*.sqlite`, `runtime/`, `tmp/`)
  are git-ignored by the root `.gitignore`.
- No tick/proposal capture is implemented in WP-01; later work packages add
  capture behind Dataset Passport + Data Quality Gate.
- Resolve the root via `@deriv-trader/config` `resolveDataRoot()` so tests and
  the worker agree deterministically. Relative roots stay inside the repo;
  absolute roots are allowed only when explicitly configured.
