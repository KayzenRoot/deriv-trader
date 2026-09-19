# Evidence — DT-WP-03 QUANT & STRATEGY ENGINE MODULE

Status: READY_FOR_REVIEW (executor verdict; ChatGPT review owns APPROVED)
Risk: HIGH_ASSURANCE — research/strategies only, no economic execution
Work Order: DT-WP-03-QUANT-STRATEGY
Base checkpoint: DT-CP-0006

## 1. Canonical base and branch

- Canonical repository: https://github.com/KayzenRoot/deriv-trader
- Compile main SHA: `995c5988c62e3fc9888a4c7f407fd92e309e7f15`
- Verified `origin/main` at execution: identical (PR #6 merged as `d520fa7`; checkpoint `17769f8` DT-CP-0006; `git fetch --all --prune --tags` clean, working tree clean)
- Target branch: `work/DT-WP-03-QUANT-STRATEGY` (created from verified main)
- Final head SHA: recorded in the final executor report after commit

## 2. Environment

- `node --version`: v24.18.0 / `npm --version`: 11.16.0
- Host: Windows (PowerShell 5.1); CI: Ubuntu `ubuntu-latest`

## 3. Dependencies added

- `zod`: 4.6.5 already pinned at root; newly consumed by `@deriv-trader/strategies` for typed preset schemas (no new package, no version change)
- No new packages, no new versions, no lockfile churn beyond the workspace edge; no ML stack; no Python runtime

## 4. Dataset Passports used

- `quant-fixture-v1` (committed `packages/research/fixtures/quant-v1/`: 600 synthetic ticks + 120 synthetic proposal snapshots, seed 20260918, grade synthetic) — machinery proof only
- `dt-wp02-fixture-v1` (WP-02 committed Parquet fixtures) — untouched, still green
- CLI/lab runs generate passports per run into local gitignored `data/research/` (never committed)
- All acceptance verdicts keyed off passport identity + grade

## 5. Feature/replay/strategy/preset versions

- SFG `sfg-1`; replay `wp03` manifest code version per run; strategies `1.0.0` × 5 families; presets `seed-1` (+`seed-1+vN` search variants); simulator policy `sim-policy-1`; research config `research-1` / `cli-default`

## 6. What was implemented

- SFG (`strategies/features`): 20+ primitives (multi-window returns/log-returns/slopes, EMA anchor explicitly not VWAP, volatilities, range position, mean/median/MAD, z-scores, RSI-like, persistence/runs, acceleration, tick rate, per-tick change, efficiency, compression/expansion, jump flags), past-only windows, immutable hashed snapshots, shared graph with bounded rings
- Replay (`research/replay`): market-only vs proposal-aware modes structurally separated; as-of proposal joins; tolerance-bounded settlement (UP/DOWN/FLAT/UNKNOWN); deterministic manifests; two-phase vote-then-join so direction precedes economics
- Edge Gate (`strategies/edge`): exact r/p_be/edge/EV math, PASS/FAIL/UNKNOWN, UNKNOWN on missing economics or uncalibrated p_hat, zero execution authority
- Engine contract extended (`strategies/engine`): full input/output envelope, NO_SIGNAL helper, `pBeOf` helper; legacy skeleton contract preserved
- Five families with symmetric CALL/PUT, preset zod schemas, seed presets, bounded grid search (`strategies/presets`, budget-capped, reproducible order)
- Calibration (`research/calibration`): reliability bins, adequacy gates, Brier/log-loss/diagnostics; null when thin
- Quant Lab (`research/lab`): splits, baselines, bounded dev search with ledger, walk-forward sensitivity, OOS on sealed test, verdict rules with synthetic-grade cap
- Anti-leakage (`research/splits`): overlap rejection, FinalTestLock (tuning throws once sealed)
- Metrics (`research/metrics`): full §16 set with Wilson + mean CIs, market-only stays non-monetary
- Simulator (`research/simulator`): versioned policy, deterministic ordering/tie-break, slots/caps/cooldown/daily, no confluence, no risk-engine import
- CLI (`dt-research` bin): inspect/replay/matrix/sensitivity/portfolio, manifests + summaries to gitignored `data/research/`, runtime no-ENABLED guard

## 7. Deterministic replay proof

- `replay.test.ts`: repeat runs byte-identical decisions + manifest hash; truncation test proves no lookahead (boundary-correct comparison); future proposals never joined; thin settlement → UNKNOWN; market-only realized always null with points present

## 8. Anti-leakage/final-test guard proof

- Split overlap construction rejected; `FinalTestLock.tune` throws once sealed while `measure` stays open; search ledger contains zero test-fold attempts (asserted); repeat lab runs byte-identical verdicts

## 9. Five-strategy / 15-profile matrix

CLI `matrix --seed 42` (also covered in-process by tests): all 15 profiles `RETEST_REQUIRED` — "synthetic fixture coverage only; needs real proposal-aware history". Zero `OOS_PASSED` on synthetic (grade cap), zero `ENABLED` (structurally impossible in WP-03: no code path assigns it; CLI throws if ever observed).

## 10. Market-only vs proposal-aware metrics

- Market-only: directional hit rate + CI, points, NO_SIGNAL reasons; expectancy fields null by construction
- Proposal-aware: full monetary expectancy per stake + CI, break-even averages, profit factor, drawdown/loss runs; joined economics only from as-of snapshots

## 11. Calibration availability/limitations

- Framework fit + diagnostics implemented and unit-proven; pipeline probes adequacy per profile; fixture-scale evidence returns `adequate: false` → `p_hat: null` everywhere in practice; quality scores never converted to probabilities

## 12. Sensitivity/stress/sequence-risk results

- Sensitivity stable 15/15 on fixtures (CLI `sensitivity --seed 42`); perturbation helper in lab; block-bootstrap sequence-risk covered by seeded Monte-Carlo path in lab options; payout/latency/thinning/gap stress via deterministic replay variants in tests

## 13. Multi-Runner simulation evidence

- CLI `portfolio --seed 42`: fills=6, pnl=+4.500, slotsBlocked=0 on fixture replay; unit tests prove slot/instrument/cooldown/daily-stop rules, deterministic ordering, starvation telemetry, no signal mutation

## 14. Test counts + CI run IDs

- Local: 26 files / 120 tests green, stable across repeats
- Product/governance CI run IDs on final head: recorded in the final executor report after push; both must be SUCCESS before stopping
- CI failure analyzed and fixed during execution: push run `35416922434` failed the R7 lifecycle test on the slower runner (one shared overlap flag let a slow capture starve universe/pulse ticks). Fixed with per-task overlap guards plus skip accounting and per-task concurrency proof; the test uses short real intervals with poll-to-condition instead of fake timers fighting real async I/O. Re-verified locally (3× green) before push.

## 15. Exact profile verdicts

All 15 `RETEST_REQUIRED` (synthetic grade cap). No `OOS_PASSED`, no `PROSPECTIVE_VALIDATION` (needs live prospective data), no `REJECTED` (no negative evidence — strategies behave sanely), no `SUSPENDED`.

## 16. Confirmation

NO profile was moved to ENABLED — no code path in WP-03 can assign it (verdict type includes the state for future WPs only; lab caps synthetic at RETEST_REQUIRED; CLI guards at runtime). No profitability claimed anywhere.

## 17. Unresolved warnings/deviations

- `sharp` allow-scripts notice, Vitest fsModuleCache hint, Actions runner notices — all pre-existing, unrelated
- No dependency deviations; no legacy endpoints; no scope expansion (no buy/sell/auth/risk/UI/money)
- UNRESOLVED_CRITICAL_HIGH: 0
