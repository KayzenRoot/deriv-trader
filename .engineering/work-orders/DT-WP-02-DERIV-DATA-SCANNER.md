# Work Order DT-WP-02 — DERIV DATA & SCANNER MODULE

STATUS: APPROVED / CLOSED
BASE CHECKPOINT: DT-CP-0005
PROMOTED CHECKPOINT: DT-CP-0006
RISK: HIGH_ASSURANCE
HISTORICAL BACKLOG COVERAGE: DT-API-0001 + DT-DATA-0001 + DT-SCANNER-0001

## Objective
Implement the complete read-only market/data/scanner foundation in one coherent Work Package so the next package can focus directly on quantitative replay and strategy engines.

## Scope

### A. Current Deriv Options public API adapter
Implement current public Options WebSocket integration using the canonical public endpoint:
- REST base: https://api.derivws.com
- public WS: wss://api.derivws.com/trading/v1/options/ws/public

Implement typed, broker-isolated support for:
- active_symbols;
- contracts_for;
- ticks;
- ticks_history;
- proposal;
- forget / forget_all where needed;
- req_id correlation;
- subscription IDs;
- public connection lifecycle.

Do not implement buy, sell, proposal_open_contract, portfolio, balance, statement, OAuth/PAT token use, OTP trading socket, or any account-scoped economic action in this Work Package.

### B. Connection Supervisor
Implement:
- one reused public WebSocket by default;
- connection state machine;
- bounded exponential reconnect + jitter;
- conservative heartbeat;
- request correlation;
- idempotent subscription registry;
- restore subscriptions once after reconnect;
- invalidate stale pre-reconnect state;
- explicit cleanup/forget;
- deterministic test transport/injection.

### C. API Budget Manager
Implement configurable runtime budgets based on current documented defaults at compile time:
- proposal + proposal_open_contract + buy + sell: 360/minute and 14,400/hour shared;
- all other WS calls: 220/minute and 14,400/hour;
- REST limits tracked where relevant.

Even though buy/sell are out of scope, reserve a configurable safety share for future execution/reconciliation and never allow scanner traffic to consume the whole proposal budget.

Budget classes:
CRITICAL_EXECUTION
RECONCILIATION
SIGNAL_PROPOSAL
MARKET_DISCOVERY
REPORTING
BACKGROUND

Implement queue/admission/backoff telemetry without rate-limit evasion.

### D. Schema Drift Guard + Error Taxonomy
Use runtime schemas at the Deriv adapter boundary.
Prefer current New API field names.
Known examples:
- active_symbols: underlying_symbol, underlying_symbol_name, underlying_symbol_type, pip_size;
- proposal request: underlying_symbol;
- contracts_for uses simplified current response;
- proposal response fields beyond id may be absent/nullable and must be checked before economic calculations.

Unknown critical states fail closed.
Record safe schema mismatch evidence without secrets.

### E. Shared Market Data Pipeline
Implement normalized:
- ActiveInstrument;
- ContractCapability;
- MarketTick;
- ProposalEconomics;
- ApiBudgetState;
- MarketFreshnessState;
- eligibility snapshot types.

One underlying tick stream per unique symbol, fanned out internally to multiple consumers.
No Runner count x external-subscription multiplication.

### F. Symbol & Contract Registry
Implement live registry from active_symbols + contracts_for.
No hard-coded tradable-symbol list.

Track:
- active/suspended state;
- current symbol metadata;
- CALL/PUT availability;
- contract category/type;
- capability TTL;
- last refresh;
- errors/staleness.

Important: current contracts_for may not provide enough duration metadata to prove 60/180/300-second support. Do not infer support from missing metadata. Use bounded proposal capability/economics probing under the API Budget Manager where required. Unsupported/rejected duration remains ineligible.

### G. Payout Pulse Scheduler
Implement adaptive proposal refresh across the eligible universe for CALL/PUT and 60/180/300-second candidates, within available broker capabilities.

Proposal key must include at least:
- underlying symbol;
- contract type/direction;
- expiry/duration;
- currency/basis/amount assumptions used to obtain economics.

Compute:
effective_payout = (payout - ask_price) / ask_price
break_even_probability = ask_price / payout

Default actionable threshold: effective payout >= 0.80.

If ask_price/payout are missing, zero, invalid, stale or non-normalizable, mark unknown/ineligible. Never fabricate economics.

Priorities:
0 future execution/reconciliation reserve
1 fresh proposal for a concrete future signal
2 candidates near/above threshold
3 routine refresh
4 cold discovery

No stale proposal is executable authority.

### H. Market Freshness Matrix
Implement per symbol/contract/expiry freshness for:
- symbol registry;
- capability;
- ticks;
- continuity/gaps;
- proposal;
- connection;
- clock skew.

States:
FRESH
AGING
STALE
GAPPED
UNTRUSTED

Reconnect must invalidate dependent state until fresh data arrives.

### I. Eligibility Engine / Opportunity Lattice
Produce deterministic eligibility:
ELIGIBLE
PAYOUT_TOO_LOW
UNSUPPORTED_EXPIRY
UNSUPPORTED_CONTRACT
MARKET_INACTIVE
TICK_STALE
PROPOSAL_STALE
USER_BLOCKED
API_DEGRADED
UNKNOWN_FAIL_CLOSED

Eligibility is not a trading signal.
No strategy CALL/PUT logic is implemented here.

### J. Local data capture
Implement bounded prospective capture of:
- normalized ticks;
- proposal/payout snapshots;
- capture-session metadata;
- schema/parser/build provenance.

Raw payload retention should be selective/bounded.

### K. Parquet + DuckDB
Use the maintained DuckDB Node Neo client (@duckdb/node-api, current stable 1.5.5 line at compile time) unless a documented compatibility blocker is proven.

Use DuckDB/Parquet to implement:
- partitioned tick storage;
- partitioned proposal storage;
- analytical reads;
- deterministic fixture/query tests;
- atomic finalize/rename where practical;
- no one-file-per-event design.

Suggested partitions:
data/normalized/ticks/date=YYYY-MM-DD/symbol=<symbol>/
data/proposals/date=YYYY-MM-DD/symbol=<symbol>/expiry_s=<60|180|300>/

Do not move high-frequency raw data into Supabase/Postgres.

### L. Dataset Passport + Data Quality Gate
Implement immutable manifest model with:
- dataset id/version;
- source;
- collector/parser/schema versions;
- Git SHA;
- files/hashes;
- row counts;
- time range;
- symbols;
- gaps/anomalies;
- proposal coverage;
- parent dataset when derived.

Implement DQG checks for:
- duplicates;
- non-monotonic time;
- invalid quote/economics;
- gaps;
- clock skew;
- schema mismatch;
- partition overlap;
- missing contract/expiry identity.

Severities:
INFO
WARN
BLOCK_DATASET
BLOCK_TRADING_INPUT

### M. Recovery / disk pressure / compaction baseline
Implement:
- in-progress temp files;
- safe finalization;
- quarantine/recovery of incomplete capture files;
- configurable batching/roll thresholds;
- local disk-pressure telemetry;
- stop optional capture before disk exhaustion;
- compaction path or deterministic compaction helper with row/hash verification.

Exact tuning values must be configurable and recorded, not guessed as immutable product truth.

### N. Trader Worker integration
Wire the new module into apps/trader without implementing strategy/risk/execution authority.

Add read-only/status endpoints useful for review, such as:
- /v1/market/status
- /v1/scanner/status
- /v1/scanner/opportunities
- /v1/data/status

These endpoints expose safe operational state only, not broker secrets.

## Current external facts to re-verify at executor start
Use current official Deriv documentation and downloadable schemas as source of truth.
At compile time:
- public Options WS = wss://api.derivws.com/trading/v1/options/ws/public;
- active_symbols/contracts_for/ticks/ticks_history are no-auth market-data messages;
- proposal is no-auth;
- active_symbols current fields use underlying_symbol naming;
- proposal request uses underlying_symbol;
- proposal shared WS budget is currently 360/minute and 14,400/hour with buy/sell/open-contract;
- all-other WS calls are currently 220/minute and 14,400/hour;
- subscriptions should be cleaned with forget/forget_all;
- limits may change and must remain configurable.

If official endpoint reference/schema conflicts with an older workflow/example snippet, prefer the current endpoint reference/schema and document the discrepancy.

## Explicitly out of scope
- buy/sell;
- authenticated demo/real trading sockets;
- OTP implementation beyond typed future interface if necessary;
- account balances/portfolio/statements;
- real credentials;
- strategy engines;
- Edge Gate acceptance;
- risk engine;
- order lifecycle;
- live money;
- final product UI.

## Safety invariants
- read-only/public broker integration only;
- no economic action;
- no secret required;
- no API-limit evasion;
- one shared stream per underlying symbol where safe;
- stale/gapped/unknown input fails closed;
- proposal economics must be actual normalized fields, never invented;
- no historical tick data represented as historical payout evidence;
- Git remains canonical;
- existing package-boundary rules remain green.

## Required tests
Implement deterministic unit/integration/fixture tests covering at minimum the canonical scanner and data test matrices, including:
- new API field parsing;
- malformed payload fail-closed;
- req_id correlation;
- duplicate subscription prevention;
- reconnect exactly-once restoration;
- stale state invalidation;
- payout threshold transition;
- proposal number|string normalization where applicable;
- missing economics;
- unsupported expiry;
- API budget pressure/backoff;
- duplicate/gap/clock-skew DQG;
- Parquet roundtrip;
- Dataset Passport reproducibility;
- crash/incomplete-file recovery;
- compaction row/hash preservation;
- no direct web import of scanner/risk/market service internals.

## Live public contract smoke
Create an opt-in bounded command/test for the current public Deriv API that:
- uses no credentials;
- performs only a very small number of calls/subscriptions;
- proves active_symbols parsing;
- proves one contracts_for parse;
- proves one tick subscription and cleanup;
- attempts a bounded proposal parse only when safe/supported;
- records sanitized evidence.

Do NOT make ordinary CI depend on external Deriv availability. CI must remain deterministic/offline using fixtures/mocks. Live smoke is explicit evidence, not a flaky always-on CI dependency.

## Validation
At minimum:
- npm ci;
- check:eol;
- check:deps;
- check:cycles;
- lint;
- typecheck;
- unit/integration tests;
- Parquet/DuckDB tests;
- build;
- web build regression;
- trader health/status smoke;
- npm audit high;
- git diff --check;
- product CI;
- governance CI;
- bounded live public Deriv smoke when network is available.

## Evidence
Create:
.engineering/evidence/DT-WP-02-DERIV-DATA-SCANNER.md

Record:
- base checkpoint/main SHA;
- branch/head SHA;
- exact dependency additions;
- official API/schema references and verification date;
- live-smoke evidence;
- CI run IDs;
- dataset fixture/passport hashes;
- test counts;
- API-budget configuration;
- known warnings/deviations;
- exact scope change summary.

## Review
APPROVED / CORRECTION_REQUIRED / BLOCKED

## STOP CONDITION
SATISFIED by exact-head review ec9b85c87b10da053c5322fcc83183cea63a1a1b, green product/governance PR workflows, squash merge PR #6 and DT-CP-0006 promotion.
