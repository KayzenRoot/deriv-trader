# Evidence — DT-WP-03 QUANT & STRATEGY ENGINE MODULE

Status: READY_FOR_REVIEW (executor verdict; ChatGPT review owns APPROVED)
Risk: HIGH_ASSURANCE — research/strategies only, no economic execution
Work Order: DT-WP-03-QUANT-STRATEGY (+ CORRECTION-001 review findings)
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

- Local: 26 files / 123 tests green, stable across repeats
- Final head `5a70588` (PR #7 https://github.com/KayzenRoot/deriv-trader/pull/7):
  product push run `35417447361` SUCCESS; product PR run `35417449775` SUCCESS;
  governance PR run `35417449779` SUCCESS (all 2026-09-19 on
  `work/DT-WP-03-QUANT-STRATEGY`)
- If this file was updated after those runs to record their IDs, that update is
  an evidence-only commit; CI re-runs on the new tip and its run IDs are
  confirmed SUCCESS before stopping (see final executor report)
- CI failure analyzed and fixed during execution: push run `35416922434` failed the R7 lifecycle test on the slower runner (one shared overlap flag let a slow capture starve universe/pulse ticks). Fixed with per-task overlap guards plus skip accounting and per-task concurrency proof; the test uses short real intervals with poll-to-condition instead of fake timers fighting real async I/O. Re-verified locally (3× green) before push.

## 18. CORRECTION-001 dispositions (review findings F1–F17)

- F1/F2 replay integrity: symbol-bound replay (per-symbol cadence, per-symbol settlement, exact symbol delivery, ordered same-timestamp handling); proposal joins TTL-gated by versioned economics policy (`replay-econ-1`, default TTL 60s); digests bind full identity. Unit-proven: stale-by-TTL quotes rejected, future quotes never joined.
- F3 SFG quality + preflight: duplicate/out-of-order/stale ticks excluded openly and counted (`excludedTicks`); stale latest tick → UNTRUSTED; common `preflight` (51-bar floor, STALE/GAPPED/UNTRUSTED refusal) runs first in all five families. Unit-proven incl. UNTRUSTED_INPUT refusal.
- F4/F7 admission + fold handles: ledger tags every attempt with fold + access (`search` dev-only; `measure`/`calibration` tagged per fold); sealed test fold measured exactly once per profile, never searched (asserted: no `search` access on test).
- F5 calibration + edge in OOS: dev-fold calibration probe recorded in ledger (`access: calibration`); outputs keep `p_hat: null`; edge math unchanged and exact.
- F6 baselines / walk-forward / stress: constant-CALL passive baseline per expiry on dev (ledger `measure` rows, `devBaselineExpectancy` per verdict); winner walk-forward triple dev/validation/test per verdict; 20% payout-haircut stress per OOS (`oosStressedExpectancy`, pure helper unit-tested).
- F8/F9 simulator: `toSimulatorSignals` uses real expiry-specific runner identity (cooldown/accounting no longer conflates expiries); ordering, caps, cooldown, daily stops unit-proven.
- F10 presets: expiry-specific seed identity (`seed-1+<family>+<expiry>s` + hash); strict 12-variant total budget incl. seed.
- F11 cache: per-symbol snapshot cache with per-symbol invalidation, keyed by symbol/time/provenance/version/options.
- F13 fixtures: exact-behavior strategy fixtures (pullback CALL at displacement / NO_RESUMPTION before / NO_PULLBACK after reclaim / mirrored PUT; breakout WEAK_HOLD then CALL; snapback research-preset CALL/PUT pair + seed-preset silence documented).
- F14 tick rate: last-50-tick window rate, never whole-history.
- F15 budget: `MAX_VARIANTS_PER_RUN = 12` total, seed first, deterministic order.
- F16 Parquet loader: `readParquetTicks` ordered by (event_time, sequence) with bigint-safe coercions.
- F17 metrics: Wilson + mean CIs, monetary/non-monetary separation, haircut stress helper.
- CLI `--dataset synth|quant-fixture`: committed quant-v1 fixture replayable from the CLI; smoke-proven (`replay --dataset quant-fixture` → decisions=120; unknown dataset fails closed). Replay/portfolio derive symbol + time range from the loaded dataset.
- Strategy logic corrections from fixture work: pullback trend leg on `slope_50`, resumption on `slope_5`, depth as excursion from `recent_high/low_15` with slow-anchor integrity gate; new SFG outputs `recent_high/low_15`, `last_close`.
- Deliberately deferred (documented, not silently dropped): multi-round proposal fixtures (rounds=1 kept — no manufactured joins); rolling-window walk-forward (dev/validation/test winner triple instead); `maxSpikeMultiple` preset field reserved (spike rejection via anomaly filter).

## 15. Exact profile verdicts

All 15 `RETEST_REQUIRED` (synthetic grade cap). No `OOS_PASSED`, no `PROSPECTIVE_VALIDATION` (needs live prospective data), no `REJECTED` (no negative evidence — strategies behave sanely), no `SUSPENDED`.

## 16. Confirmation

NO profile was moved to ENABLED — no code path in WP-03 can assign it (verdict type includes the state for future WPs only; lab caps synthetic at RETEST_REQUIRED; CLI guards at runtime). No profitability claimed anywhere.

## 17. Unresolved warnings/deviations

- `sharp` allow-scripts notice, Vitest fsModuleCache hint, Actions runner notices — all pre-existing, unrelated
- No dependency deviations; no legacy endpoints; no scope expansion (no buy/sell/auth/risk/UI/money)
- UNRESOLVED_CRITICAL_HIGH: 0
