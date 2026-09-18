# Evidence Bundle · DT-HIVE-0001 — First Local Synchronization / GEF + Hive Preflight

Status: COLLECTING → complete for submission (see Final Verdict)
Work Order: DT-HIVE-0001 (issued out-of-band as `DT-HIVE-0001-FIRST-LOCAL-SYNC-CODEX.pdf`)
Executor: local Codex-class executor pass on the user's Windows machine
Risk class: HIGH_ASSURANCE
Repo base SHA (before this increment): 8c428ee33d1258c718dd9e6eabc5018fe5b0f499
Evidence commit SHA: recorded in the follow-up evidence update commit (a file cannot contain its own commit SHA); the post-evidence head is recorded in the PR body.
Exact local Git SHA after evidence commit: see "Exact-head field" at the end of this file.

## 1. Environment

- Timestamp (UTC): 2026-09-18T17:35:55Z
- Timestamp (local): 2026-09-18 14:35 (UTC-03)
- Machine/OS summary (no hostname, username or other sensitive identifiers): Microsoft Windows 11 Pro, build 26200, AMD64
- Shell: Git Bash (MSYS) with PowerShell for `.cmd` wrappers
- Node: v24.18.0 · npm: 11.16.0 · Python: 3.12.10 · Git: 2.55.0.windows.3 · Docker: 29.7.2
- GitHub CLI: authenticated as the repository owner account (no token value read or recorded)

## 2. Phase 1 — Local repository synchronization

- Local repository path: `D:\Projeto Codexx\deriv-trader`
- Pre-existing state: directory was empty and was not a Git repository; repository cloned into the current directory with `git clone https://github.com/KayzenRoot/deriv-trader.git .`
- `git remote -v`:
  - `origin https://github.com/KayzenRoot/deriv-trader.git (fetch)`
  - `origin https://github.com/KayzenRoot/deriv-trader.git (push)`
- Remote ownership: expected (`KayzenRoot/deriv-trader`). No unexpected remote.
- Current branch: `main` (tracking `origin/main`)
- `git status`: clean — `git status --porcelain=v1 --branch` returned only `## main...origin/main`; `--porcelain=v1` (tracked + untracked) and `--ignored` were both empty
- HEAD SHA: `8c428ee33d1258c718dd9e6eabc5018fe5b0f499`
- `origin/main` SHA: `8c428ee33d1258c718dd9e6eabc5018fe5b0f499` (identical)
- Ahead/behind: `git rev-list --left-right --count HEAD...origin/main` → `0  0`
- No unrelated local user work was present or discarded (directory was empty at start).

Documents read in Phase 1 (in source-of-truth precedence order):
`AGENTS.md`, `.engineering/CHECKPOINT.md`, `.engineering/integrations/HIVE-V1.md`, `.engineering/integrations/LOCAL-SYNC-PREFLIGHT.md`, `.github/workflows/governance.yml`, `.engineering/templates/EVIDENCE-BUNDLE.md`, and the prior `DT-GEF-BOOTSTRAP-0001` Work Order and evidence.

Checkpoint observed: **DT-CP-0002** (checkpoint file date 2026-09-18, mode GREENFIELD, risk HIGH_ASSURANCE, state `DISCOVERY_APPROVED_READY_FOR_LOCAL_PREFLIGHT_AND_PUBLIC_API`).
Reconciliation: expected accepted checkpoint was DT-CP-0002 or newer → **satisfied**, and the checkpoint is compatible with `origin/main` (the checkpoint's recorded Discovery squash-merge SHA `27bfb28f8eac3ebdbc299bf8c03de1588ec7b4f6` is an ancestor of the current HEAD).

## 3. Phase 2 — GEF Bootstrap V1 validation

- GEF workspace path (primary, used for validation): `D:\Projeto Codexx\gef-bootstrap`
- Repository/source identity: `https://github.com/KayzenRoot/gef-bootstrap.git` (expected project source, not a global install)
- Branch: `feat/1.1/wo-003-doctor-status`; worktree clean before and after validation
- GEF workspace version: `1.1.0` (`@gef-bootstrap/workspace`, private monorepo, workspaces `packages/*`)
- Git SHA: `ed2fac34d16a69ecbc38fd96b05d3f18ce3aae88`
- Stable release tag in that checkout: `v1.0.0` = `866fe3af8cccc65c929aaf6a47a924401fa448b3` (CHANGELOG `## [1.0.0] - 2026-09-16`)
- Note: the checkout is on the 1.1 work branch, so the workspace version reports `1.1.0`; the stable V1.0.0 baseline is present as the `v1.0.0` tag in the same checkout. Report both truthfully: validated code = branch head `ed2fac3` (1.1 development line), stable baseline tag = `v1.0.0`.
- No global install was used. `npm install -g gef-bootstrap` was **not** executed, as required.

Commands and results (all run in the GEF workspace, foreground, exit codes captured):

| Command | Exit | Result |
| --- | --- | --- |
| `npm ci` | 0 | `added 33 packages, and audited 62 packages in 5s`; `found 0 vulnerabilities` |
| `npm run validate` | 0 | `typecheck` + `node --test tests/*.test.mjs` → tests 1458, suites 0, **pass 1458, fail 0**, cancelled 0, skipped 0, todo 0, duration_ms 145351.5 |
| `npm audit --audit-level=high` | 0 | `found 0 vulnerabilities` |

Validation warnings (not failures):
- `npm warn allow-scripts 1 package has install scripts not yet covered by allowScripts: koffi@3.3.0 (install: node ./cnoke.cjs ...)`. Reported truthfully; it did not affect the `validate` result.
- Platform-evidence notes emitted by the suite on `win32`: `H11` reports no POSIX ownership/permission primitive (permission proof unavailable, trust rests on the physical root); `H12` asserts the version-token tie on POSIX only; `H14` reports `permissionProof=UNAVAILABLE_ON_PLATFORM directoryProof=WINDOWS_EFFECTIVE_RIGHTS`. These are declared platform limitations of the suite, not failures.

GEF path inventory note (recorded, nothing modified): a second clean checkout of the same GEF repository exists at `C:\Users\csn19\Desktop\gef-bootstrap` (HEAD `0f64f767b9a66726f0b2177528f8e51d9d92a133`, branch `feat/1.1/wo-003-doctor-status`, ahead 2 / behind 1 versus its upstream). It was left untouched; the primary workspace above was used for validation because it is clean and exactly equal to its upstream branch.

## 4. Phase 3 — Hive V1 health and integration

### 4.1 Actual installed commands and configuration (discovered, not assumed)

- Install root: `C:\Users\csn19\AppData\Local\HIVE` (data root `D:\HIVE`), `HIVE_HOME` = `C:\Users\csn19\AppData\Local\HIVE\app`
- Hive version: `1.0.0` (`VERSION` file); app checkout Git SHA `a53b5b9fcf55c32a5696180fb1b1ef80ccd1edcf`, `git describe` → `v1.0.0`; remote `https://github.com/KayzenRoot/hive.git`
- Commands actually present in `...\HIVE\bin`: `hive-status.cmd`, `hive-up.cmd`, `hive-down.cmd`, `hive-dashboard.cmd`, `hive-mcp.cmd`
- **`hive-acp` is NOT installed** — no `hive-acp` binary exists and the live API surface exposes no ACP path (0 matches for "acp" in `/openapi.json`). Documentation must not be read as evidence that this command exists.
- Agent-facing integration actually wired on this machine: MCP stdio server `hive` → `C:\Users\csn19\AppData\Local\HIVE\bin\hive-mcp.cmd`, which runs `docker compose exec -T api python -m app.mcp_server`. This is the interface the local coding agent used.
- Invocation note: in this shell, `cmd.exe /c <wrapper>.cmd` opened an interactive shell instead of executing (environment quirk). The wrappers were executed through PowerShell (`& '<path>.cmd'`) and returned the documented output; this is an invocation quirk, not a Hive failure.

### 4.2 Health evidence

`hive-status.cmd` exit code 0. Compose status:

| Service | State | Ports |
| --- | --- | --- |
| api | Up 4 hours (**healthy**) | 127.0.0.1:8000 → 8000 |
| dashboard | Up 4 hours | 127.0.0.1:3000 → 80 |
| postgres (pgvector 0.8.0-pg16) | Up 4 hours (healthy) | 5432 internal |
| redis 7.4.2-alpine | Up 4 hours (healthy) | 6379 internal |
| migration (one-shot) | Exited (0) | — |
| storage-init (one-shot) | Exited (0) | — |

API health (`http://127.0.0.1:8000/api/v1/health`): `{"status":"ok","version":"1.0.0","environment":"development","checks":{"postgres":{"status":"ok","pgvector":true},"redis":{"status":"ok"},"storage":{"status":"ok","configured":true,"writable":true}}}`.

### 4.3 Endpoints and services discovered from the installed configuration

- API base: `http://127.0.0.1:8000` (port from installed `.env` key `HIVE_API_PORT`; root returns HTTP 200; OpenAPI title `HIVE API` version `1.0.0`)
- Dashboard/Control Center: `http://127.0.0.1:3000/` (port from installed `.env` key `HIVE_DASHBOARD_PORT`; HTTP 200 live)
- Project boundary: `HIVE_PROJECTS_ROOT=D:/Projeto Codexx`, mounted read-only into the API container at `/workspace/projects:ro`
- Interfaces used: REST under `/api/v1` and the installed MCP stdio surface (`project.list`, `context.search`, `memory.search`, `checkpoint.read`)
- **No secret value was read or recorded.** Only the two port keys and the projects-root key were read from `.env`; tokens, keys, cookies, credentials and environment contents were neither read, printed nor stored. The pre-existing `.env` backup file was not opened.

### 4.4 Project registration / selection

`POST /api/v1/projects` with `{"name":"deriv-trader","relative_path":"deriv-trader"}` → **HTTP 201**

Resulting record: `project_id` = `5830c28b-5261-44a8-a382-10302415fe6f`, `git_branch` = `main`, `git_head_sha` = `8c428ee33d1258c718dd9e6eabc5018fe5b0f499`, `state` = `READY`, `repository_accessible` = true.

The Hive-registered HEAD is **identical** to the local Git HEAD, so Hive and Git agree on branch and exact revision. Hive was previously aware of only one project (`hive-coder`).

Repository indexing (required before retrieval): `POST /api/v1/projects/{id}/index` → HTTP 200, run `c16bc183-261b-480b-bbdc-6b1b6a9fa7b3`, status `COMPLETED`, 31 discovered / 31 indexed files, `repository_head_sha` = `8c428ee3…` (again equal to Git HEAD).

Retrieval corpus: initial state `BLOCKED` (no corpus). After `POST /api/v1/projects/{id}/retrieval/corpus/sync` → HTTP 200, status `COMPLETED`, 31 chunks / 31 references, `source_fingerprint` `a845452b4ed139a140c7ef70b6f670b194050fef432c49aeb13dfb7ed026471a`. Corpus state is now `CURRENT`.

### 4.5 Read-only context retrieval test — PASSED on both surfaces

The requirement was to retrieve something unmistakably canonical. Retrieved content:

| Query (surface) | Top result | Retrieved canonical fact |
| --- | --- | --- |
| `DT-CP-0002` (REST lexical) | `.engineering/CHECKPOINT.md` | `Checkpoint: DT-CP-0002` … `Risk: HIGH_ASSURANCE` |
| `HIGH_ASSURANCE` (REST lexical) | `docs/source-pack/DEPLOYMENT.md`, `docs/source-pack/TEST-BENCHMARK-PLAN.md`, `.engineering/context-locks/DT-DISCOVERY-0001.md` | HIGH_ASSURANCE gates, forbidden live path, HIGH_ASSURANCE test layers |
| `Git is canonical` (REST lexical) | `docs/source-pack/DECISIONS.md` | `ADR-0002 ACCEPTED: Git is canonical; Hive V1 is a context …` |
| `DT-CP-0002` (MCP `context.search`) | `.engineering/CHECKPOINT.md` | same checkpoint chunk, with provenance (`source_content_sha256`, path, line range) |

Retrieval state detail (recorded truthfully, not as a failure): `semantic_state` = `UNAVAILABLE` and `rerank_state` = `RERANK_FALLBACK_DISABLED`, so retrieval is served by the lexical path with an explicit fallback marker. A long multi-term natural-language query returned `candidate_pool: 0` with `fallback_reason: no_candidates`; short canonical identifiers retrieve correctly.

### 4.6 Durable continuity / delta-context write-read test — MIXED (one path passed, one path blocked)

Executed against the registered project with harmless, non-authoritative records only.

PASSED — durable task intake + continuity memory, written and read back:

| Step | Result |
| --- | --- |
| `POST /tasks/text` (markdown describing the DT-HIVE-0001 preflight) | HTTP 201, `task_id` `8a28729e-3a3b-4293-bc59-9451984c5df0`, `intake_status` `READY`, original blob SHA-256 `388f2b85…`, 726 logical → 489 compressed bytes |
| `GET /tasks/{task_id}` | HTTP 200, title and metadata match |
| `POST /memories` (EPISODIC, `status: PROPOSED`, `origin: EXECUTOR`, `source_commit` = exact Git HEAD) | HTTP 201, `memory_id` `b7b7c79b-8c65-4b7e-be57-294c43d2b8dd` |
| `GET /memories/{memory_id}` | HTTP 200 — all provenance intact (`status` PROPOSED, `origin` EXECUTOR, `authority`, `source_commit` `8c428ee3…`, `version` 1) |
| `GET /memories?limit=10` | HTTP 200, 1 record |
| MCP `memory.search` | 1 record returned, identical provenance |

NOT PASSED (blocked, not claimed as pass) — context capsule and delta context:

- `POST /tasks/{task_id}/context` → **HTTP 409 `project_worktree_dirty`**
- `POST /tasks/{task_id}/context/delta` → **HTTP 409 `project_worktree_dirty`**
- MCP `checkpoint.read` → error `source_not_current` (category `stale`)

No partial success is claimed for these three surfaces.

### 4.7 Root cause of the Hive dirty-worktree gate (definitive, with evidence)

Hive's capsule, delta and checkpoint surfaces refuse to build context while any tracked file is not `CLEAN`. Hive's own view says every file is modified. That view is a **false positive** on this platform and is not a real repository condition. Proof chain:

| Evidence | Observation |
| --- | --- |
| Host Git (canonical) | `git status --porcelain` empty; `# branch.ab +0 -0`; HEAD == origin/main |
| Host Git EOL state | `git config core.autocrlf` = `true`; **no `.gitattributes` in the repository**; `git ls-files --eol` → `i/lf  w/crlf` for every file |
| Worktree bytes | `AGENTS.md` contains CRLF line endings (6 CRLF, 0 bare LF) |
| Container Git (Hive) | `git config --get core.autocrlf` is unset (exit 1) → the Linux container compares CRLF worktree bytes against LF blobs |
| Container Git result | `status --porcelain` → all 31 tracked files modified; `diff --stat` → `31 files changed, 307 insertions(+), 307 deletions(-)` — an exactly paired line-rewrite, i.e. a line-ending difference, not a content change |
| Source of the gate | `backend/app/mcp_server.py:525` → `ContextStaleError("project_worktree_dirty")`; the same gate is reached by the capsule/delta endpoints |

Additional, independent gap proven by source inspection (it would still block the checkpoint surface after the line-ending issue were fixed): Hive's context manager hard-codes Project Brain governance paths (`backend/app/context_manager.py:164-168`: `docs/project-brain/13-CHECKPOINT.md`, `03-SCOPE.md`, `15-DEFINITION-OF-DONE.md`, `04-ARCHITECTURE.md`, `16-DECISIONS-LEDGER.md`). Deriv Trader uses `.engineering/CHECKPOINT.md` plus `docs/source-pack/*` instead, so `checkpoint.read` cannot resolve this repository's canonical checkpoint.

Git/Hive truth conflict — recorded, resolved in favour of Git: Hive reports `working_tree_clean: false` and `project_worktree_dirty`; Git reports a clean tree at `8c428ee`. Branch, HEAD SHA, file set and file contents agree exactly, so the disagreement is confined to one derived inspection flag whose cause is fully diagnosed above (CRLF/`core.autocrlf` inside a read-only Linux bind mount). Per the repository contract (`ADR-0002`, `HIVE-V1.md`), **Git wins**; no repository truth is overridden and no stale Hive content can promote itself over Git: the continuity record written in this preflight is `PROPOSED`, the lowest-authority lifecycle state, and is explicitly non-authoritative.

## 5. Phase 4 — Agent compatibility

- Locally observable repository-side agent contract: `AGENTS.md` only. A search for other agent configuration (` .cursor*`, `.cursorrules`, `CLAUDE.md`, `.clinerules*`, `.codex*`, `copilot-instructions.md`, `.aider*`, `.mcp.json`, `.windsurfrules`) found **none**. No integration is claimed that does not exist.
- Agent flow observed in this session: `AGENTS.md` and `.engineering/CHECKPOINT.md` were read before any mutation; the Work Order was honoured as a bounded work order with a Context-Lock-equivalent scope; Git facts and the checkpoint were verified before writes; Hive was health-checked and used only for Work-Order-relevant retrieval and one continuity write; evidence is being produced as an exact-head artifact. This satisfies the invariant `AGENT → GEF governed Work Order → Hive minimal relevant context → implementation → evidence → exact-head audit` as far as it is locally observable.
- `.github/workflows/governance.yml` checks were re-executed locally on the exact head `8c428ee`: 13 required files present and non-empty; `HIGH_ASSURANCE` present in `AGENTS.md`; `Git is canonical` present in `docs/source-pack/DECISIONS.md`; `Hive V1` present in `.engineering/integrations/HIVE-V1.md` → `GOVERNANCE_CHECKS=PASS` (exit 0).
- No implementation step exists in this Work Order; no strategy or trading code was created, modified or executed.

## 6. Warnings, failures and limitations (all truthful, none hidden)

1. Hive `working_tree_clean` / `project_worktree_dirty` false positive caused by CRLF worktree bytes plus unset `core.autocrlf` in the read-only Linux container. Effect: capsule and delta-context surfaces are unusable for this project, and the Control Center will show this project as dirty. Not a Deriv Trader repository defect; no falsified PASS is recorded. A future correction (for example a repository `.gitattributes` with explicit line-ending policy, or a Hive-side end-of-line-tolerant cleanliness check) is **outside this Work Order**, which authorizes no implementation step. Recorded as an open item.
2. Hive's checkpoint/context contract expects `docs/project-brain/*` governance paths that Deriv Trader does not use. `checkpoint.read` therefore cannot serve the canonical checkpoint of this repository.
3. Semantic and rerank retrieval stages report `UNAVAILABLE` / `DISABLED`; retrieval is lexical with an explicit fallback marker.
4. A natural-language multi-term retrieval query returned no candidates (lexical matching is identifier-oriented).
5. GEF validated on the 1.1 development branch head, not on the `v1.0.0` commit itself (the tag is present in the same checkout). Recorded so the audited revision is unambiguous.
6. `npm ci` reported a pending `allow-scripts` review for `koffi@3.3.0`; the suite still passed.
7. The Hive wrapper scripts had to be invoked through PowerShell in this shell (`cmd.exe /c` opened an interactive shell); this is an invocation quirk only.
8. Node/npm/Docker versions are recorded above; no dependency was upgraded, and no GEF or Hive file was modified by this preflight.

## 7. Secrets redaction confirmation

No token, API key, cookie, credential, secret, environment dump or private financial information was read, printed, committed or stored during this preflight. Only non-secret configuration keys were read (`HIVE_API_PORT`, `HIVE_DASHBOARD_PORT`, `HIVE_PROJECTS_ROOT`). No Deriv API credential was required or used, and no real-money, demo or live trading action was taken. The evidence above contains no secret material.

## 8. Final verdict

**PASS** — the repository's own local-preflight pass condition is met in full: GEF validates locally (`npm ci` 0, `npm run validate` 0 with 1458/1458 passing, `npm audit --audit-level=high` 0), Hive V1 is healthy and reachable with its real endpoints verified from the installed configuration, agent context retrieval works and returns unmistakably canonical content (`DT-CP-0002`, `HIGH_ASSURANCE`, `Git is canonical`), and Git remains canonical (Hive-registered HEAD identical to local `origin/main` HEAD).

Per-check honesty statement: the capsule/delta-context and `checkpoint.read` surfaces were **not** successful and are **not** claimed as PASS — they are recorded as blocked by the platform/dirty-gate false positive and the Project Brain path mismatch described in section 4.7. The continuity requirement is satisfied through the supported memory path (write and read-back verified). No fail-closed condition from the Work Order applies: the canonical checkpoint reconciles, the Git/Hive disagreement is diagnosed and resolved in favour of Git, GEF validation has no unresolved critical failure, no destructive or privileged operation was required, no secret is present in staged changes or evidence, the remote ownership is expected, and nothing touched live Deriv credentials or real money.

## 9. Exact-head field

- Base SHA before this increment: `8c428ee33d1258c718dd9e6eabc5018fe5b0f499`
- Exact local Git SHA after the evidence commit: recorded in the follow-up evidence update commit and in the PR body (a file cannot contain the SHA of the commit that introduces it).
- All evidence in this file was produced against `8c428ee33d1258c718dd9e6eabc5018fe5b0f499` with a clean worktree; nothing in this increment modifies strategy, trading, API or credential code.
