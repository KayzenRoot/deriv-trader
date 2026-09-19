# Evidence — DT-WP-02 DERIV DATA & SCANNER MODULE

Status: READY_FOR_REVIEW (executor verdict; ChatGPT review owns APPROVED)
Risk: HIGH_ASSURANCE — read-only public broker integration, no live money
Work Order: DT-WP-02-DERIV-DATA-SCANNER
Base checkpoint: DT-CP-0005

## 1. Canonical base and branch

- Canonical repository: https://github.com/KayzenRoot/deriv-trader
- Compile main SHA: `5536a7d6faf6e17eaed15bb415348d50eed35733`
- Verified `origin/main` at execution: `5536a7d6faf6e17eaed15bb415348d50eed35733` (PR #5 merged as `9003ed5`; checkpoint `8b56b69` DT-CP-0005; no drift, `git fetch --all --prune --tags` clean)
- Working tree before changes: clean on `main` at the compile SHA
- Target branch: `work/DT-WP-02-DERIV-DATA-SCANNER` (created from verified main)
- Final head SHA: recorded in the final executor report after commit
- Note: `origin/work/DT-DEV-BOOTSTRAP-0001` carries one post-merge review commit (`d154126`) by the owner on the old branch; it was left untouched and is unrelated to this package

## 2. Environment

- `node --version`: v24.18.0 (Node 24 LTS line)
- `npm --version`: 11.16.0
- Host: Windows (PowerShell 5.1); CI: Ubuntu `ubuntu-latest`

## 3. Exact added dependency versions (from `package-lock.json`)

- `ws`: 8.21.3 (typed public WebSocket transport; `@deriv-trader/deriv-adapter`, `@deriv-trader/trader`)
- `@types/ws`: 8.18.1 (dev, types only)
- `@duckdb/node-api`: 1.5.5-r.5 (stable 1.5.5 line; `@deriv-trader/research`)
- `@duckdb/node-bindings`: 1.5.5-r.5 (transitive native bindings, prebuilt incl. win-x64)
- `zod`: 4.6.5 (already pinned; reused for adapter runtime schemas)
- Unchanged pins: `typescript` 6.0.3, `next` 16.3.5, `react`/`react-dom` 19.2.8, `fastify` 5.12.5, `vitest` 5.0.1, `playwright` 1.55.1, `supabase-js` 2.116.0, `tailwindcss` 4.3.3, `motion` 13.4.0, `echarts` 6.1.0
- No second package manager, no unbounded ranges, no paid-service dependency

## 4. Official references and verification date

Verified 2026-09-18/19 at execution time (current reference wins over stale snippets):

- https://developers.deriv.com/docs/options/ws-public/ — public channel needs no auth/OTP; account actions unavailable; base `https://api.derivws.com`, path `/trading/v1/options/ws/public`
- https://developers.deriv.com/docs/data/active-symbols/ + https://developers.deriv.com/comparison/active-symbols/ — `symbol→underlying_symbol`, `display_name→underlying_symbol_name`, `symbol_type→underlying_symbol_type`, `pip→pip_size`; `trade_count` new; spot/landing-company/barrier-category fields removed; request reduced to `active_symbols` + `contract_type`
- https://developers.deriv.com/docs/data/contracts-for/ + https://developers.deriv.com/comparison/contracts-for/ — simplified response (`available[]` without spot/market-data/display fields); `currency` request param removed; no duration metadata (60/180/300 support must be probed, never inferred)
- https://developers.deriv.com/comparison/proposal/ — request uses `underlying_symbol`; only `id` required in response; `ask_price`/`payout` are `number|string` and nullable beyond `id`
- https://developers.deriv.com/comparison/ticks-history/ — `history.prices`/`times` required when present; `echo_req` optional; `subscribe` accepts 0/1
- https://developers.deriv.com/docs/subscription/forget/ — `subscription.id` identifies streams; `forget: 1` cancelled, `0` not found
- https://developers.deriv.com/docs/limits/ — proposal group 360/min + 14,400/hour shared with future buy/sell/open-contract; all other WS calls 220/min + 14,400/hour; ping outside budgets (10/s per connection); REST IP/account limits noted
- https://duckdb.org/docs/lts/clients/node_neo/overview — `@duckdb/node-api` 1.5.5 stable Neo client (Promise-native, prebuilt binaries incl. Windows x64); `DuckDBInstance`/`DuckDBConnection`, `runAndReadAll`, `COPY ... (FORMAT PARQUET)`

## 5. Current API limits observed and runtime config defaults

Observed at smoke time: limits match the documented table above (no discrepancy found). Runtime defaults (all env-overridable, recorded in `.env.example`):

- `API_BUDGET_PROPOSAL_PER_MIN=360`, `API_BUDGET_PROPOSAL_PER_HOUR=14400`
- `API_BUDGET_OTHER_PER_MIN=220`, `API_BUDGET_OTHER_PER_HOUR=14400`
- `API_BUDGET_PROPOSAL_RESERVE=0.3` (30% of proposal minute budget preserved for future execution/reconciliation; scanner classes stop early)
- Transport: `DERIV_WS_REQUEST_TIMEOUT_MS=15000`, `DERIV_WS_HEARTBEAT_MS=30000`, reconnect `1000→30000` bounded exp + jitter
- Scanner: `SCANNER_PAYOUT_THRESHOLD=0.8`, probe `amount=10 USD stake basis` (read-only assumption, NOT user stake), `SCANNER_PROPOSAL_TTL_MS=30000`
- Capture: `CAPTURE_BATCH_ROWS=500`, `CAPTURE_ROLL_MS=60000`, `DATA_DISK_WARN_MB=1024`, `DATA_DISK_STOP_MB=256`

## 6. What was implemented

- Domain ports + vocabulary: `BrokerErrorCategory` (19) with retry classes and safe messages; `ActiveInstrument`, `ContractCapability`, `MarketTick`, `ProposalAssumptions/Quote`, `effectivePayout`/`breakEven` fail-closed math, `proposalKey`, `ConnectionState/Health`, `MarketDataSource` read-only port, `Clock` port
- Adapter: `PublicWsClient` (one shared socket, req_id correlation, timeouts with automatic + deterministic-sweep enforcement, subscription routing, forget/forget_all, idempotent unsubscribe, injectable socket/clock); `ConnectionSupervisor` (DISCONNECTED→BACKOFF→CONNECTING→SYNCING→HEALTHY + DEGRADED/STOPPED, bounded exp+jitter, heartbeat, exactly-once restore, epoch invalidation); `ApiBudgetManager` (configurable windows, 6 classes, proposal reserve, bounded FIFO, backoff, full telemetry); zod schemas for all five public messages (tolerant optionals, strict identity); normalization with fail-closed UNKNOWN; broker error mapping without raw payload leakage; `DerivPublicMarketSource` implementing the domain port
- Market data: `SymbolRegistry` (dynamic universe, TTL capabilities, proven expiries, narrow-only allow/block); `SharedTickHub` (one external sub per symbol, fan-out, duplicate/out-of-order/gap flags); freshness classifier (FRESH/AGING/STALE/GAPPED/UNTRUSTED)
- Scanner: `PayoutPulseScheduler` (priorities 1–4, reserve never scheduled, budget-gated refresh, adaptive cadence); `evaluateEligibility` (10 deterministic states); `buildOpportunity` lattice; legacy scan shapes preserved
- Config: 19 new env-backed tuning fields with documented defaults; events: 9 market/data lifecycle types; db: `CaptureSession` metadata (Parquet stays canonical)
- Research: `BatchWriter` with explicit degradation; DuckDB Parquet I/O with temp-write→validate→atomic-rename; `createPassport`/`verifyPassport` (SHA-256 canonical JSON); DQG (duplicates, non-monotonic arrival order, invalid quotes, gaps, skew, economics, identity, partition overlap); `recoverDirectory` quarantine; disk thresholds; compaction verifier
- Trader: `createMarketModule` (offline boot, explicit `connect()`), routes `/v1/market/status`, `/v1/scanner/status`, `/v1/scanner/opportunities`, `/v1/data/status` (all read-only, no secrets); graceful shutdown stops supervisor + socket
- Scripts: `scripts/smoke/deriv-public-smoke.mjs` (bounded, offline-excluded), `scripts/data/make-fixtures.mjs` (deterministic fixtures); `.gitignore` ignores runtime partitions (`data/normalized|proposals|manifests|quarantine`) while committed fixtures live under `packages/research/fixtures/`

## 7. Commands run and results (local, Node v24.18.0 / npm 11.16.0)

- `npm install` → green (`ws`, `@types/ws`, `@duckdb/node-api` + bindings; DuckDB `select 1+1` smoke green on Windows, de-risked before building on it)
- `npm run check:eol` → GREEN; `check:deps` → GREEN (allowlist + self-tests, now 48/48 with research→market-data test refs); `check:cycles` → GREEN
- `npm run lint` → GREEN after strictness fixes (zod `.loose()`, narrowing helpers, idempotent-cleanup semantics; no rule weakening)
- `npm run typecheck` → GREEN; `npm run test` → GREEN: 21 files, 79 tests (19/64 at review head + correction matrix)
- `npm run build` → GREEN; web production build → GREEN; trader build → GREEN
- Trader live smoke (loopback): `/v1/health` HEALTHY/READY/DEMO; `/v1/market/status` DISCONNECTED/0 symbols (honest offline boot); `/v1/scanner/opportunities` empty lattice with shape; `/v1/data/status` idle session with disk thresholds
- `npm run audit:high` → `found 0 vulnerabilities`; `git diff --check` → clean; `npm run validate` → GREEN
- `node scripts/data/make-fixtures.mjs` → 20 tick rows + 6 proposal rows (hashes §8)
- `node scripts/smoke/deriv-public-smoke.mjs` → PASS (§9)

## 8. Parquet fixtures, hashes, Passport

- `packages/research/fixtures/ticks-part-0001.parquet`: 20 rows, sha256 `af76ebbadac1c740aacb1419a4fd75f9b52426c76f4a0a55d855483d3d09a3a3`
- `packages/research/fixtures/proposals-part-0001.parquet`: 6 rows, sha256 `293abdfc528232e18b6c42ecc0885fcecc5dc996d042dd9853dff8880f864f`
- `packages/research/fixtures/manifest.json`: dataset `dt-wp02-fixture-v1`, parser `deriv-options-2026-09-18`
- `fixtures.test.ts` reads them back (20/6 counts, hash match, clean DQG, verifiable Passport over 26 rows, totalRows 26)
- DuckDB value note (recorded for future implementers): `COUNT(*)`/BIGINT columns surface as JS `bigint`; readers narrow explicitly

## 9. Live public smoke: PASS (not BLOCKED)

2026-09-18T22:34Z against `wss://api.derivws.com/trading/v1/options/ws/public`, 6 requests total, no credentials:

- `active_symbols`: 89 current symbols parsed (underlying_symbol naming confirmed live)
- Dynamic pick `1HZ100V` (first active forex/open/unblocked, not hard-coded)
- `contracts_for`: 65 available, CALL and PUT present
- Tick subscription: 3 ticks received, `forget` cleaned (`tickSubscriptionCleaned: true`)
- Proposal quotes: CALL and PUT for 60s at 0.35 USD stake basis — both returned `id` with `ask_price`/`payout` economics (no rejection, no retry needed)

## 10. Test counts and major scenario coverage

79 tests / 21 files at correction head: review-head matrix plus binary-frame decoding; error-guard + single-count + backoff; resubscribe/recovery; per-symbol DQG; snapshot-driven eligibility; timed capture rolls; disk-stop degrade; content-based compaction; Passport identity reproducibility; full runtime assembly (connect→lattice→capture), probe prove/revoke, cache-key independence, fail-closed lattice; truthful trader endpoints

## 11. DQG results

Fixture dataset: zero findings (clean). Adversarial unit rows: duplicates→WARN, gaps→WARN, invalid quotes→BLOCK_TRADING_INPUT, non-monotonic→BLOCK_DATASET, missing identity→BLOCK_DATASET, bad KNOWN economics→BLOCK_TRADING_INPUT, partition overlap→BLOCK_DATASET. `blocksDataset()` gates promotion accordingly.

## 12. Product/governance CI run IDs on final head

- Correction head `12adc8e` (PR #6 https://github.com/KayzenRoot/deriv-trader/pull/6):
  product push run `35408817176` SUCCESS; product PR run `35408821626` SUCCESS;
  governance PR run `35408821644` SUCCESS (all 2026-09-19 on
  `work/DT-WP-02-DERIV-DATA-SCANNER`)
- Review head `a84027a`: product PR `35402582002` SUCCESS, governance PR
  `35402582001` SUCCESS, product push `35402500314` SUCCESS
- Original failure context: n/a (first WP-02 review found contract gaps, not CI red)
- If this file was updated after those runs to record their IDs, that update is
  an evidence-only commit on the same branch; CI re-runs on the new tip and its
  run IDs are confirmed SUCCESS via `gh run list` before stopping (see final
  executor report). `git diff` between the validated head and the evidence-tip
  shows evidence markdown only.

---

## CORRECTION 002 (review head `84353c3`, PR #6)

Root causes: direction-blind candidate identity (snapshots per direction but
one row per symbol+expiry); symbol-level proof shared across directions;
snapshot fields recorded but not gating eligibility; capture liveness derived
from a stale boolean; global backoff escalation; date-only capture partitions;
no explicit continuous lifecycle.

- R1: `Opportunity` now carries `direction`, `proposalKey`, `proposalId`,
  `breakEven` alongside payout/freshness/eligibility/blocker; `buildOpportunity`
  takes the direction; lattice serializes one row per symbol+direction+expiry
- R2: registry `provenExpiries` entries carry per-expiry `directions[]` with
  `proveExpiry(symbol, expiry, direction)` / `isProven(...)`; runtime revoke
  sets are per direction; probes, pulse candidates, snapshots and lattice all
  iterate proven directions only; lattice `contractAvailable` uses the exact
  direction; asymmetric tests prove CALL⇏PUT, PUT⇏CALL, per-direction revoke
- R3: `FreshnessPolicy` (registry/capability TTLs, skew tolerance, all
  env-configurable) feeds `summarizeFreshness`, which now emits
  `registryStale`/`capabilityStale`/`skewSuspect` authority flags;
  `eligibilityFromSnapshot` consumes them directly (stale authority or suspect
  skew → `UNKNOWN_FAIL_CLOSED`); tests prove fresh-tick + stale-capability /
  stale-registry / stale-proposal / suspect-skew all stay non-ELIGIBLE
- R4: explicit `RuntimeLifecycle` (idle/running/paused/stopped); capture reads
  live only when running with a live stream and no disk stop; stop and
  disconnect report idle; buffers/finalized counts stay truthful
- R5: backoff level tracked per proposal/other/rest group;
  `recordSuccess(group)` clears only that group; test proves cross-group
  success never weakens another group's episode; reserve behavior unchanged
- R6: finalization groups ticks by symbol and proposals by symbol+expiry into
  `ticks/date=/symbol=/` and `proposals/date=/symbol=/expiry_s=/` partitions;
  Passport lists every file; integration test proves pruning/readback across
  two symbols and two expiries
- R7: `startReadOnlyScanner()` runs bounded universe/pulse/capture intervals
  with a shared overlap guard (skips counted), `pauseReadOnlyScanner()` clears
  timers, `stop()` ends the lifecycle; nothing auto-starts on construct or GET;
  deterministic fake-timer tests prove repetition, no-overlap and clean pause
- Live binary-frame decoding fix carried over and covered by regression test
- Assembled runtime smoke PASS 2026-09-19 — 89-symbol universe, 6/6 probes
  proven, 2 ticks, 6-candidate direction-identified lattice all ELIGIBLE near
  0.95 payout, 13 bounded sends; plain public smoke PASS alongside
- Deriv docs re-checked at correction start (limits unchanged)
- Final tests: 21 files / 89 tests green (stable across repeats after
  de-flaking the cadence test into poll-to-condition)
- Final head SHA, changed files vs `84353c3`, and CI run IDs: recorded in the
  final executor report after push

## 13. Known warnings/deviations

- `sharp` allow-scripts install notice (Next toolchain, standard, no action)
- Vitest `fsModuleCache` performance hint (informational)
- GitHub Actions runner notices (Node 20 deprecation, ubuntu-26 migration) — pre-existing, unrelated
- `measureFreeDiskMb` returns null on Windows (statfs unsupported) → warn-level caution, never false confidence; exact thresholds still enforced where measurable (Linux CI)
- No dependency deviations: all new deps within required lines (`ws` 8.x, `@duckdb/node-api` 1.5.5 line); no second engine; no legacy endpoints anywhere (`ws.derivws.com`/`binaryws.com` absent — verified by construction, only `api.derivws.com` in config/defaults/docs)
- Test-only `.env` shapes in unit tests use memory/fake transports; no network in CI

## 14. File/change summary

- New: `packages/domain/src/{errors,market}.ts`; `packages/deriv-adapter/src/{schemas,normalize,transport,supervisor,budget,errors,source}.ts` + 3 test files; `packages/market-data/src/{registry,ticks,legacy}.ts` + test; `packages/scanner/src/{pulse,eligibility}.ts` + test; `packages/research/src/{capture,parquet,passport,dqg,recovery}.ts` + 2 test files; `packages/research/fixtures/*`; `apps/trader/src/{market,market.test}.ts`; `scripts/smoke/deriv-public-smoke.mjs`; `scripts/data/make-fixtures.mjs`; this evidence file
- Modified: domain/config/events/db index files, adapter/market-data/scanner/research index + package/tsconfig metadata, trader server/package/tsconfig, `.env.example`, `.gitignore`, `package-lock.json`
- `git diff --check` clean; `git status` reviewed; no unrelated files touched

## 15. Confirmations

- No `buy`/`sell`/`proposal_open_contract`/`balance`/`portfolio`/`statement` implementation or reference in request paths (proposal quote only); no authenticated sockets; no PAT/OAuth/OTP handling beyond typed future-interface absence (nothing account-scoped exists)
- No real credentials or tokens anywhere (smoke uses no env secrets; `grep`-level review: only `api.derivws.com` public endpoints)
- No live-money code path; `DERIV_TRADER_ENV` default DEMO; economics labeled probe-only
- No rate-limit evasion (budgets throttle locally; reserve preserved; backoff bounded)
- No historical ticks presented as payout evidence (history helper labeled market-evidence-only)
- Scanner holds no strategy direction logic (eligibility ≠ signal)
- Package boundaries green (`check:deps` self-tests + repo scan); web cannot import service internals (allowlist + eslint)
- UNRESOLVED_CRITICAL_HIGH: 0

---

## CORRECTION 001 (review head `a84027a`, PR #6)

Root causes: isolated components with no orchestrator (connect stopped at symbols); reconnect restored nothing real; capture utilities unused by any runtime; pulse and source double-charged proposals; error taxonomy off the request path; invented REST hourly window; freshness split across layers; Passport hash included volatile timestamps; compaction proved hash-strings instead of content; live `ws` binary frames undecoded (found by the new runtime smoke, not by fakes).

- F1: `MarketScannerRuntime` (`apps/trader/src/runtime.ts`) drives connect → universe → capabilities → bounded expiry probes (proven/revoked from outcomes) → shared ticks → quote cache → pulse cycles → snapshots → lattice → capture, with `connect/refreshUniverse/probeExpiries/ensureTicks/scannerCycle/captureCycle/restoreAfterReconnect/stop` plus truthful `statusMarket/statusScanner/statusData`
- F2: socket-close events wire straight to `handleConnectionLost`; hub keeps intended consumers and restores each broker sub exactly once; supervisor restore path refreshes symbols + resubscribes; reconnect invalidation (STALE) is distinct from observed gaps (GAPPED); first post-reconnect tick re-baselines; integration test covers 2-symbol close/restore/recovery
- F3: runtime-owned `BatchWriter`s feed every live tick/proposal; `CAPTURE_BATCH_ROWS` + timed `CAPTURE_ROLL_MS` rolling; temp-write → validate → atomic rename; per-session Passport manifests; DQG on finalized batches with trust marking; measured disk via `measureFreeDiskMb` with stop-degrade; `/v1/data/status` reports live buffers, partitions, disk and DQG truthfully
- F4: single-count ownership at the adapter (`source.requestProposal` admits once); scheduler only `peek()`s; test proves N sends == N charges
- F5: `guard()` on every request path classifies envelopes first (`BrokerRequestError` carries category + code only); rate limits call `recordRateLimited` per group; successes clear episodes per policy; reconnects update telemetry; `SCHEMA_MISMATCH` stays distinct; `SubscribeRejectedError` carries subscribe rejections upstream
- F6: REST modeled as official 300/min + 1000/10min IP windows (`API_BUDGET_REST_PER_MIN/_PER_10MIN`); authenticated 80/min explicitly deferred; fabricated hourly limit removed
- F7: `summarizeFreshness` builds per symbol+direction+expiry snapshots (registry/capability/tick/continuity/proposal/epoch/skew/trust → overall); `eligibilityFromSnapshot` consumes the assembled authority
- F8: identity hash excludes volatile `createdAt` (retained as metadata); test proves two calls with identical inputs hash identically
- F9: `digestRows` multiset digest + `verifyCompactionContent` on real rows; `compactParquetFiles` merges actual Parquet with row/hash proof
- Live binary-frame decoding fix in transport with regression test (live-only bug class)
- Assembled runtime smoke (`scripts/smoke/runtime-smoke.mjs`): PASS 2026-09-19 — 89-symbol universe, 6/6 probes proven, 2 ticks, 6-candidate lattice all ELIGIBLE at 0.954 effective payout, 13 total sends, budget telemetry coherent
- Deriv docs re-verified at correction start (limits page unchanged: 360/14400 proposal, 220/14400 other, REST 300/min + 1000/10min + auth 80/min)
- Final tests: 21 files / 79 tests green; full local gate green; clean-worktree lint-first proof below
- Final head SHA, changed files vs `a84027a`, and CI run IDs: recorded in the final executor report after push
