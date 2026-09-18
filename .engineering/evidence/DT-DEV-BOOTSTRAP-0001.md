# Evidence — DT-DEV-BOOTSTRAP-0001 (DT-WP-01 Foundation Module)

Status: READY_FOR_REVIEW (executor verdict)
Risk: HIGH_ASSURANCE
Work Order: DT-DEV-BOOTSTRAP-0001
Base checkpoint: DT-CP-0004

## 1. Canonical base and branch

- Canonical repository: https://github.com/KayzenRoot/deriv-trader
- Prompt-compile main SHA: `caae248f531c0f44ef52d591164ddc36e4122334`
- Verified `origin/main` at execution: `caae248f531c0f44ef52d591164ddc36e4122334` (no drift; `git fetch --all --prune --tags` clean)
- Local `HEAD` before changes: `caae248f531c0f44ef52d591164ddc36e4122334`
- Working tree before changes: clean, already on `work/DT-DEV-BOOTSTRAP-0001` (branch pre-created from verified main; no re-creation needed, no user work destroyed)
- Target branch: `work/DT-DEV-BOOTSTRAP-0001`
- Final head SHA: recorded in PR body after commit (implementation validated on working tree matching the committed content; `git diff --check` clean, `git status` reviewed). Implementation head and evidence-tip relationship is documented in section 10.

## 2. Environment

- `node --version`: v24.18.0 (Node 24 LTS line, satisfies engines `24.x`)
- `npm --version`: 11.16.0 (satisfies engines `11.x`)
- `python --version`: 3.12.10 (used only for local version queries/normalization helpers)
- Host: Windows (PowerShell 5.1); `.gitattributes` LF policy added and validated (section 7).

## 3. Resolved key dependency versions (exact, from `package-lock.json`)

Lockfile: `package-lock.json` committed (`lockfileVersion` 3, 357 packages).

- `typescript`: 6.0.3 (6.x strict line)
- `next`: 16.3.5 — DEVIATION from frozen 16.2.x, see section 9
- `react`: 19.2.8 (19.2.x line)
- `react-dom`: 19.2.8
- `tailwindcss`: 4.3.3 (4.3.x)
- `@tailwindcss/postcss`: 4.3.3
- `motion`: 13.4.0 (13.x)
- `echarts`: 6.1.0 (6.1.x; only published 6.1 patch)
- `fastify`: 5.12.5 (5.12.x)
- `@supabase/supabase-js`: 2.116.0 (2.x)
- `zod`: 4.6.5 (runtime schema validation for config boundaries)
- `vitest`: 5.0.1 (5.x)
- `playwright`: 1.55.1 (1.55.x; pinned, browsers skipped in foundation CI)
- `eslint`: 10.10.0 with `typescript-eslint` 8.70.0, `@eslint/js` 10.0.1, `globals` 17.12.0
- `@types/node`: 24.13.5, `@types/react` 19.2.18, `@types/react-dom` 19.2.7
- No second package manager introduced (npm workspaces only). No unbounded `latest` ranges. No paid-service dependency.

## 4. What was implemented

- Cross-platform hygiene: `.gitattributes` (LF for source/config/docs/scripts; CRLF reserved for `.bat`/`.cmd`/`.ps1`; binary for media/Parquet/DuckDB), `.editorconfig`, expanded `.gitignore` (Node/Next/data/secrets/Supabase/DuckDB-Parquet/coverage/Playwright/logs/editors; never ignores canonical evidence/docs), `scripts/checks/eol-check.mjs`.
- Monorepo: root `package.json` (npm workspaces, engines `24.x`/`11.x`, scripts for `check:eol`, `check:deps`, `check:cycles`, `lint`, `typecheck`, `test`, `build`, `validate`, `ci`, `audit:high`), `tsconfig.base.json` (strict + `noUncheckedIndexedAccess` + `exactOptionalPropertyTypes` + related strict flags; `skipLibCheck:true` documented in section 9), `tsconfig.json` project references, `eslint.config.mjs` (strictTypeChecked + boundary rule blocking SecretStore in web), `vitest.config.ts`, `playwright.config.ts` (foundation pin, no E2E claimed).
- Architectural checks: `scripts/checks/dep-boundaries.mjs` (layered direction + hard rules: strategies↛broker-buy, UI/web↛SecretStore, risk↛UI, research↛economic-orders) and `scripts/checks/cycle-check.mjs` (dependency-free DFS equivalent to `madge --circular`; `madge` was removed after it conflicted with TS 6 via `peerOptional typescript ^5.4.4`, see section 9).
- Domain/contracts (`@deriv-trader/domain`): `DEMO`/`REAL`, branded IDs, `RunnerIdentity` (strategy + expiry + execution profile), `ExpirySeconds` 60/180/300, `SIGNAL_CALL`/`SIGNAL_PUT`/`NO_SIGNAL`, risk/admission/result reason codes, health/service-state, canonical `EventEnvelope` (event_id/type/schema_version/occurred_at/correlation/causation/user/worker/profile/runner/order/build SHA), schema/config versions. No economic order implementation.
- Config/events/testing: `@deriv-trader/config` (zod env validation, loopback + data-root helpers; real credentials never required), `@deriv-trader/events` (envelope factory), `@deriv-trader/testing` (deterministic fixtures).
- Trader worker (`apps/trader`, Fastify 5.12.5, loopback-only): `GET /v1/health` (versioned), `GET /v1/status` (build/version/environment readiness, no secrets), startup skeleton (config → logging → local paths → adapters skeleton → HTTP readiness), `SIGINT`/`SIGTERM` graceful shutdown, loopback guard (`assertLoopback` refuses `0.0.0.0`), unit/integration tests for health/loopback/shutdown-safe creation. No Deriv socket/trading/order code.
- Web (`apps/web`, Next App Router + React + TS): foundation shell with `DEMO / FOUNDATION` status screen (web build OK + Trader Worker health if reachable via server-side fetch with timeout; unreachable state is explicit, no fabricated stats/strategies/broker state), server-safe boundaries (no SecretStore in browser, enforced by eslint + dep check), Tailwind 4.3 foundation + token placeholders (`--dt-*`), minimal ECharts smoke (`echartsSmoko` proves load without deprecated API) + minimal Motion smoke (`FadeIn`), `lib/foundation` unit tests, production build green.
- Auth/DB/connections/secret-store: `@deriv-trader/auth` (Supabase client factory returns `null` without credentials; offline-safe), `@deriv-trader/db` (interfaces + `MemoryDbClient` + `migrations/0001_foundation.sql`, no provisioning), `@deriv-trader/connections` (metadata/interfaces only), `@deriv-trader/secret-store` (`SecretStore` interface + `InMemorySecretStore`; Windows Credential Manager / OS-keychain production adapter defined as boundary and deferred, see section 9). `.env.example` (names/descriptions only, no real values).
- Later-WP boundaries (compile-safe, no fake finished functionality): `deriv-adapter` (interfaces + `NullDerivAdapter`, no network), `market-data`/`scanner` (types for DT-WP-02), `strategies` (`StrategyEngine` + `NoSignalStrategyEngine`), `risk` (`RiskGate` + `FoundationRiskGate`), `execution` (`ExecutionOrchestrator` explicitly without broker calls), `research` (pure helpers, no economic imports), `reporting` (DTOs), `ui` (tokens + neutral `StatusPill`), plus `config`/`testing` shared concerns.
- Local data: `data/.gitkeep` + `data/README.md` policy (only policy files committed; Parquet/DuckDB/runtime ignored unless intentional fixtures); deterministic safe `resolveDataRoot` with test.
- CI/DX: `README.md` (Windows PowerShell setup, `npm ci`, `npm run validate`, independent/together run commands), `.github/workflows/product.yml` (install → eol → deps → cycles → lint → typecheck → test → build → web build → trader health smoke → audit → diff check; no paid services/secrets, no live Supabase/Deriv), governance workflow preserved untouched, `tests/smoke.test.ts` (import/build-graph proof).

## 5. Commands run and results

All run from `D:\Projeto Codexx\deriv-trader` on `work/DT-DEV-BOOTSTRAP-0001`:

- `git status` → clean before changes (on `work/DT-DEV-BOOTSTRAP-0001`), 151 changed/untracked entries after scaffolding (EOL normalization + new foundation + lockfile; reviewed, no unrelated data destroyed).
- `git fetch --all --prune --tags` → clean; `git rev-parse origin/main` → `caae248f531c0f44ef52d591164ddc36e4122334`.
- `npm install` → green (255 packages initially; +2 after Playwright pin; `sharp` allow-scripts warning only, no failure).
- `npm run check:eol` → GREEN after normalizing 136 pre-existing/new CRLF files to LF and skipping generated `next-env.d.ts` (git-ignored). Initially FAIL (135 files) which proved the check works and the DT-HIVE-0001 false-dirty condition is addressed.
- `npm run check:deps` → GREEN (`package boundaries OK`).
- `npm run check:cycles` → GREEN (`no workspace cycles`).
- `npm run lint` (`eslint . --max-warnings=0`) → GREEN after strictness fixes (typed-lint `projectService` + `allowDefaultProject` for root configs, `exactOptionalPropertyTypes` fixes, `require-await` fixes, deprecated ECharts API removal, test helper adjustments; no rule weakening).
- `npm run typecheck` (`tsc --build tsconfig.json`) → GREEN after removing deprecated `esModuleInterop:false` (TS 6) and setting `skipLibCheck:true` for third-party `.d.ts` (section 9); our code remains strict.
- `npm run test` (`vitest run`) → GREEN: 11 files, 22 tests passed (after fixing `resolveDataRoot` double-slash edge).
- `npm run build` (`tsc --build`) → GREEN.
- `npm --workspace @deriv-trader/web run build` (`next build`) → GREEN on 16.3.5 (after `exactOptionalPropertyTypes` fix in `TraderHealth`; route `/` dynamic, `_not-found` static).
- `npm --workspace @deriv-trader/trader run build` → GREEN; smoke `Start-Job` + `Invoke-RestMethod http://127.0.0.1:3101/v1/health` → `HEALTHY`/`READY`/`DEMO`/`0.1.0`, `/v1/status` → `READY` with `supabaseConfigured:false`, `derivAppConfigured:false` (no secrets leaked).
- `npm run audit:high` (`npm audit --audit-level=high`) → GREEN (`found 0 vulnerabilities`) after Next 16.2.12 → 16.3.5 security upgrade (section 9). Before upgrade: 1 critical (Next RCE GHSA-p293-qw3h-jr36 + GHSA-2xp9-vwfh-vxw4) + 2 high (postcss, sharp) via `next`.
- `git diff --check` → GREEN (no whitespace errors).
- `npm run validate` (eol + deps + cycles + lint + typecheck + test + build) → GREEN.
- Line-ending sanity: `git ls-files --eol` shows `i/lf w/lf` for governed files after normalization (previously `i/lf w/crlf`); `.gitattributes` policy present.

## 6. CI/local test results

- Local: all validations above GREEN on Node v24.18.0 / npm 11.16.0.
- Product CI (`.github/workflows/product.yml`) is new and complementary; governance workflow untouched. CI runs the same `validate` chain plus web build, trader health smoke, audit, and diff check without secrets or live connections. Governance CI compatibility preserved (no governance files weakened; EOL normalization only).

## 7. npm audit summary

- Final: `found 0 vulnerabilities` at `--audit-level=high`.
- Initial finding on frozen `next@16.2.12`: critical Next.js RCE + high postcss/sharp transitives with fix only via `next@16.3.5` (outside frozen 16.2.x). Action taken: minimal security deviation to `next@16.3.5` (same major, newer minor), documented here and in PR. No suppression, no `audit fix --force` beyond the version bump, lockfile committed.

## 8. EOL policy verification

- `.gitattributes` present with `text=auto eol=lf`, per-type LF rules, Windows-only CRLF for `.bat`/`.cmd`/`.ps1`, binary for media/Parquet/DuckDB.
- `.editorconfig` (`end_of_line=lf`, CRLF exception for Windows launchers).
- `scripts/checks/eol-check.mjs` GREEN; 136 files normalized from CRLF to LF (pre-existing docs/governance + new sources written on Windows).
- `apps/web/next-env.d.ts` (Next-generated, CRLF on Windows) is git-ignored and skipped by the check as a build artifact; Git normalization covers it on commit.
- `git diff --check` GREEN.

## 9. Architecture/package-boundary verification and intentional deviations

- `dep-boundaries.mjs`: GREEN. Explicit per-workspace allowlist (CORRECTION 001 §15/F3) replaces numeric ranks: `strategies`→{domain,market-data} only; `risk`→{domain} only; `execution`→{domain,risk,deriv-adapter} only; `research`→{domain,market-data,strategies} (no economic authority); `ui`→{domain} only; `web` excludes secret-store/deriv-adapter/execution/trader; plus 40 built-in must-reject/must-allow self-tests. Hard rules preserved: no strategy→broker-buy, no UI/web→SecretStore, no risk→UI, no research→economic-orders.
- `cycle-check.mjs`: GREEN, no workspace cycles.
- `tsconfig` project references mirror the same direction; `testing` is referenced by strategy/risk/execution tests as an inward (layer 2) test-only dependency.
- Deviations/reconciliations (judgment per Context Lock, all documented, none weaken governance/security/tests):
  1. `next` 16.2.12 → 16.3.5: required critical-security fix (audit RCE). Same major (16), minimal minor bump, web build + types + tests re-verified. Canonically reconciled in CORRECTION 001 §15/F5: V1-STACK-FREEZE.md and source-pack ARCHITECTURE.md now accept the current 16.3.x Active LTS/security line per https://nextjs.org/support-policy and https://nextjs.org/blog/august-2026-security-release.
  2. `madge` removed: `madge@8.0.0` declares `peerOptional typescript ^5.4.4`, conflicting with frozen TS 6.0.3 (`ERESOLVE`). Replaced with dependency-free `cycle-check.mjs` (equivalent `circular` verification, maintainable in CI). No architecture change.
  3. `skipLibCheck:true`: third-party `.d.ts` (`@supabase/*`, `tinybench` via Vitest) require DOM/Web globals while Node packages use ES-only `lib`. Enabling lib-skip is standard and does not relax checks on first-party code (strict + `noUncheckedIndexedAccess` + `exactOptionalPropertyTypes` remain on).
  4. Removed deprecated `esModuleInterop:false` (TS 6 TS5107; will stop functioning in TS 7).
  5. DuckDB native deferred: no `duckdb` npm package in the 1.5.5 baseline was resolvable/compatible without native fragility for the foundation acceptance; `db`/`research` interfaces + local-data policy preserve the boundary. Native integration belongs in its governed module. No Parquet/DuckDB runtime code in WP-01.
  6. Windows Credential Manager adapter deferred: `SecretStore` interface + `InMemorySecretStore` + `OsCredentialStoreFactory` boundary defined; native implementation deferred per Work Order guidance to avoid contaminating the bootstrap. Documented here.
  7. Playwright browsers skipped: `playwright@1.55.1` pinned + `playwright.config.ts` proves toolchain without downloading browsers or running E2E in foundation (`PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1` locally; CI does not run E2E yet — no flows to test).

## 10. Files/change summary

- Tracked modifications (EOL normalization to LF + intentional content): `.gitignore`, `README.md`, plus LF normalization across pre-existing docs/governance (`.engineering/*`, `docs/*`, `AGENTS.md`, `.github/workflows/governance.yml`). No canonical planning/governance history deleted.
- New: `.gitattributes`, `.editorconfig`, `.env.example`, `package.json`, `package-lock.json`, `tsconfig.base.json`, `tsconfig.json`, `eslint.config.mjs`, `vitest.config.ts`, `playwright.config.ts`, `scripts/checks/{eol-check,dep-boundaries,cycle-check}.mjs`, `apps/trader/*`, `apps/web/*` (App Router shell), `packages/*/package.json|tsconfig.json|src/*` (17 packages), `packages/db/migrations/0001_foundation.sql`, `data/.gitkeep`, `data/README.md`, `tests/smoke.test.ts`, `.github/workflows/product.yml`, this evidence file.
- `git diff --check`: clean. Full `git status`/diff reviewed before commit (151 entries = EOL normalization + foundation + lockfile; no secrets, no unrelated data).

## 11. Confirmations

- No credentials handled: `.env.example` contains names/descriptions only; `SecretStore` test uses in-memory dummy (`s3cr3t` in memory only, never committed as a real secret); `git status`/`grep` review shows no tokens/keys/URLs; Supabase/Deriv integrations report boolean readiness only.
- No Deriv economic call: `deriv-adapter` has no network calls (`NullDerivAdapter` only); `execution` explicitly records admission without broker calls; `strategies` returns `NO_SIGNAL` by default; `research` has no execution/deriv order imports (enforced by dep check).
- No live trading: `DERIV_TRADER_ENV` defaults to `DEMO`; web shows `DEMO / FOUNDATION` with no fabricated PnL/stats; trader health reports `DEMO`; REAL is represented as a type only, not enabled for execution.

## 12. Hive note (repo-native fallback)

- `hive_project_list` shows `deriv-trader` as accessible but with stale metadata (`git_head_sha 8c428ee`, `working_tree_clean false`) versus Git canonical (`caae248`, clean before changes). Per fail-closed rule (Git wins on substantive SHA/content disagreement), this package used repository-native GEF context (CHECKPOINT → Work Order → Context Lock → source-pack/planning docs). No Hive capsule/delta/checkpoint surface was used as a gate. `DT-HIVE-COMPAT-0001` remains parallel/important, not blocking, consistent with `V1-HIVE-COMPAT-SEQUENCING.md`.

## 13. Intentional warnings / deferred items

- `sharp` `allow-scripts` warning on install (Next image optimization native); no failure, no action (standard Next toolchain).
- Next 16.3.5 deviation (security, section 9).
- DuckDB 1.5.5 native + Windows Credential Manager native + Playwright E2E flows deferred to governed modules (boundaries preserved, no fake functionality).
- `apps/web/next-env.d.ts` git-ignored/skipped as a Next-generated artifact.

## 14. Final executor verdict candidate

`READY_FOR_REVIEW` (executor verdict; ChatGPT review owns APPROVED) — foundation
complete after CORRECTION 001, all required validations green locally and clean
lint-first proven with no dist artifacts, high-severity audit green on the
canonically reconciled 16.3.x line, EOL/boundary/cycle checks green, no secrets
or live-broker functionality, evidence complete, PR #5 open and NOT merged.

---

### Appendix — dependency direction (enforced)

`domain/contracts ← auth/connections/config/events ← market-data/scanner/strategies/risk ← execution/research/reporting/persistence adapters ← trader orchestration ← web/API presentation`. No circular dependencies. No strategy→broker-buy. No UI→SecretStore. Risk ↛ UI. Research emits no economic orders.

---

## 15. CORRECTION 001 (same branch / PR #5 — CORRECTION_REQUIRED → READY_FOR_REVIEW)

- Reviewed head: `86a2349b03d89beddc189907ea6c64c6ecfb1bd7` (PR #5,
  https://github.com/KayzenRoot/deriv-trader/pull/5).
- Original product CI failure: workflow run `35391418811`, lint step on Ubuntu.
  `npm ci`, EOL, package-boundary and cycle checks passed; `npm run lint`
  failed with 24 `@typescript-eslint` unsafe-resolution errors in
  `tests/smoke.test.ts`. Cause: workspace imports (`@deriv-trader/*`) resolved
  through `package.json` `main` → `dist`, but a clean Linux checkout has no
  generated `dist` when lint starts, while the local Windows run had build
  artifacts available. Nothing was hidden or weakened to get local green.
- PR #5 was opened during review (executor did not create it); this correction
  continues on `work/DT-DEV-BOOTSTRAP-0001` with normal commits, no merge, no
  new module, no live-money scope.

### F1 — clean CI typed lint (BLOCKING) — corrected

- Added dedicated `tsconfig.lint.json` extending the strict base with
  `paths` mapping every `@deriv-trader/*` workspace to its source
  (`packages/*/src/index.ts`, trader `apps/trader/src/index.ts`) plus `@/*`
  for web, including all package/app/test/config sources.
- `eslint.config.mjs` now uses `parserOptions.project: ["./tsconfig.lint.json"]`
  instead of `projectService` + `allowDefaultProject`, so typed lint resolves
  workspace types from source and passes immediately after clean `npm ci`
  with no `dist`. Strict `strictTypeChecked` rules are unchanged; `.mjs`
  remains `disableTypeChecked`; generated `next-env.d.ts` is eslint-ignored.
- Proven in this workspace after `npm ci` with all `dist` + `*.tsbuildinfo`
  removed: `npm run lint` GREEN with zero `dist` present (before any
  `typecheck`/`build`). Build/typecheck (`tsc --build` project references +
  `dist`) remain the authority for emit; lint is now independent of them.
- Local-only note: after manually deleting `dist` dirs, stale `*.tsbuildinfo`
  files (git-ignored, never committed) made `tsc --build` skip emit and
  dependents failed with TS2307 until the stale buildinfo was removed; clean
  CI checkouts never contain buildinfo, so this was a simulation artifact only,
  recorded here for truthfulness. `npm run typecheck`/`test`/`build` are GREEN
  after the cleanup.

### F2 — legacy Deriv endpoint (HIGH) — corrected

- Removed `DERIV_API_URL` default `wss://ws.derivws.com/websockets/v3` entirely.
- `AppConfig` now carries `derivOptionsRestBaseUrl` (default
  `https://api.derivws.com`) and `derivOptionsPublicWsUrl` (default
  `wss://api.derivws.com/trading/v1/options/ws/public`); no authenticated
  socket URL is hardcoded anywhere (authenticated demo/real sockets come from
  the account OTP response at runtime per V1-DERIV-ADAPTER.md).
- Updated `packages/deriv-adapter` (`DerivAdapterConfig`: `restBaseUrl` +
  `publicWsUrl` plus documented defaults) and `packages/connections`
  (`DerivConnectionConfig`: same shape), `.env.example`
  (`DERIV_OPTIONS_REST_BASE_URL` / `DERIV_OPTIONS_PUBLIC_WS_URL` with OTP
  comment), and added a config test asserting the new defaults and rejecting
  the legacy `websockets/v3` value. No network calls added.

### F3 — boundary checker too permissive (HIGH) — corrected

- Replaced numeric layer ranks with an explicit `ALLOWED` adjacency map per
  workspace key (see `scripts/checks/dep-boundaries.mjs`): `strategies` may
  import only `domain`/`market-data`; `risk` only `domain`; `execution` only
  `domain`/`risk`/`deriv-adapter`; `research` only
  `domain`/`market-data`/`strategies` (no economic authority); `ui` only
  `domain`; `web` excludes `secret-store`/`deriv-adapter`/`execution`/`trader`;
  `trader` excludes `ui`/`web`/`testing`. Test files (`*.test.*`) are excluded
  from production-boundary scanning.
- `npm run check:deps` now runs 40 built-in policy self-tests first (29
  must-reject pairs including risk→strategies/scanner/market-data,
  strategies→risk/execution/db/ui/web, execution→strategies/db/ui/web,
  research→execution/adapter/risk, ui/web→secret-store, web→execution/adapter,
  plus 11 must-allow pairs) and fails if the policy itself is wrong — so the
  check no longer relies on the repo merely happening to be clean. Result:
  `40/40 policy self-tests passed` + `package boundaries OK (allowlist
  enforced)`. Cycle detection (`check:cycles`, dependency-free DFS) is
  preserved and GREEN.

### F5 — canonical Next.js line stale (IMPORTANT) — reconciled

- Re-verified official pages on 2026-09-19: https://nextjs.org/support-policy
  lists `16.x (Active LTS)` / `15.x (Maintenance LTS)`; the August 2026
  security release (https://nextjs.org/blog/august-2026-security-release,
  August 25th 2026) instructs `npm install next@16.3.3 # for 16.3` to address
  two Critical vulnerabilities (GHSA-2xp9-vwfh-vxw4 AVIF RCE and
  GHSA-p293-qw3h-jr36 Windows RCE).
- Updated `docs/planning/V1-STACK-FREEZE.md` (16.3.x Active LTS/security line,
  exact patch in lockfile; verification notes cite both pages) and
  `docs/source-pack/ARCHITECTURE.md` (same line). This is canonical
  reconciliation, not an unexplained deviation: the 16.3.5 pin (newer than the
  instructed 16.3.3 within the same Active LTS line) keeps `npm audit` green
  with exact lockfile pinning and no `latest` ranges.

### F4 — evidence truthfulness (HIGH) — this section

- Local validation (this workspace, Node v24.18.0 / npm 11.16.0, AFTER fixes,
  lint run BEFORE typecheck/build on a clean `npm ci` with no `dist`):
  `npm run lint` GREEN; `check:eol` GREEN; `check:deps` GREEN (40/40
  self-tests); `check:cycles` GREEN; `typecheck` GREEN; `test` GREEN (11 files,
  23 tests); `build` GREEN; web production build GREEN; trader build + loopback
  `/v1/health` smoke GREEN (`HEALTHY`/`READY`/`DEMO`); `audit:high` GREEN (0
  vulnerabilities); `git diff --check` GREEN; `npm run validate` GREEN.
- GitHub CI evidence is recorded separately below; local results above are NOT
  presented as CI results.
- GitHub CI (PR #5, same branch, no merge): product workflow and governance
  workflow run IDs on the new exact head are recorded in the final executor
  report and PR body after push; both must be SUCCESS before stopping. New head
  SHA is recorded in the final executor report after commit. This file records
  the code-change basis (implementation head) truthfully; run IDs for the final
  tip are confirmed via the GitHub UI before the executor stops.
- Disposable clean-worktree proof (head `2187208`, detached worktree, no
  `node_modules`, no `dist`, no `*.tsbuildinfo`): `npm ci` (257 packages) →
  `npm run lint` GREEN immediately with 0 `dist` dirs present (F1 proven, no
  build first); `check:eol` GREEN; `check:deps` GREEN (40/40 self-tests);
  `check:cycles` GREEN; `typecheck` GREEN; `test` GREEN (11 files, 23 tests);
  `build` GREEN; web production build GREEN; trader build + loopback
  `/v1/health` smoke GREEN (`HEALTHY`/`READY`/`DEMO`); `audit:high` GREEN (0
  vulnerabilities); `git diff --check` clean. Worktree removed after proof.
