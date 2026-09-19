# Work Order DT-WP-03 — QUANT & STRATEGY ENGINE MODULE

STATUS: READY_FOR_EXECUTION
BASE CHECKPOINT: DT-CP-0006
RISK: HIGH_ASSURANCE
HISTORICAL BACKLOG COVERAGE: DT-STRAT-0001 + Quant Lab / Backtest / Runner Research Gate

## Objective
Implement the complete research and strategy-engine layer in one coherent Work Package so Deriv Trader can deterministically replay captured market/proposal data, compute shared features once, evaluate the five strategy families, measure payout-aware edge, validate each 1m/3m/5m Runner profile independently, and simulate several Runners together without introducing economic execution.

This Work Package MUST build real research tooling and strategy code, not merely placeholders. It MUST NOT fabricate profitability or mark unproven profiles as enabled.

## Core invariants

- one Runner = one strategy family + one expiry profile;
- supported expiry profiles are exactly 60s / 180s / 300s;
- each strategy-expiry profile is researched and accepted/rejected independently;
- no cross-strategy voting, confirmation or veto;
- strategies do not call Deriv, Risk Engine, buy/sell or execution code;
- NO_SIGNAL is a first-class result;
- same data + code + config + seed must replay deterministically;
- no lookahead / future leakage;
- Dataset Passport + Data Quality Gate are mandatory for acceptance-grade research;
- historical tick-only replay MUST NOT pretend exact historical payout was known;
- proposal-aware replay uses only prospectively captured proposal evidence available at decision time;
- final untouched test data cannot be reused for iterative tuning;
- no Runner may be labeled ENABLED in WP-03 because demo execution validation belongs to WP-04;
- live money remains prohibited.

## A. Shared Feature Graph

Implement a versioned Shared Feature Graph (SFG) that computes common market primitives once per symbol/time context and fans immutable snapshots to strategies.

Requirements:
- bounded ring/window buffers;
- incremental updates where practical;
- no recomputing full history per Runner/tick;
- deterministic feature version/hash;
- exact event-time provenance;
- no future data;
- common features separated from strategy decisions.

Common primitives should include at minimum:
- multi-window simple/log returns;
- robust slope / linear-regression slope;
- EMA/adaptive-price-anchor values;
- realized volatility;
- rolling high/low/range position;
- robust median/mean and dispersion;
- z-score / robust z-score;
- RSI-like descriptive momentum;
- directional persistence / sign runs;
- acceleration/deceleration;
- tick arrival rate / density;
- price-change-per-tick;
- directional efficiency;
- compression/expansion measures;
- anomaly/jump/gap flags.

Do not implement a true VWAP unless reliable volume is actually present. Use an explicitly named Adaptive Price Anchor / EMA/TWAP-like price anchor otherwise.

SFG output must be immutable and serializable:
- featureVersion;
- underlyingSymbol;
- eventTime;
- source Dataset Passport / partition identity;
- feature values;
- freshness / anomaly flags;
- stable feature hash.

## B. Deterministic Replay Clock & Labeling

Implement a deterministic replay engine over local Parquet/DuckDB datasets.

Modes:

### B1. Market-only replay
Uses historical/prospective ticks/candles for signal logic and directional outcome study.
It must mark payout economics as UNKNOWN unless proposal data was actually captured.
It cannot produce acceptance-grade monetary expectancy from invented payout.

### B2. Proposal-aware replay
Joins the latest valid proposal snapshot that was actually available at decision time for:
- symbol;
- CALL/PUT direction;
- expiry;
- proposal assumptions;
- freshness.

No future proposal may be joined backward.

Replay requirements:
- monotonic event clock;
- chronological partition reading;
- deterministic tie handling;
- exact decision timestamp;
- expiry target timestamp;
- settlement-reference lookup at/after target within a configurable tolerance;
- outcome labels UP / DOWN / FLAT / UNKNOWN before strategy-specific win/loss mapping;
- no silent interpolation across large data gaps;
- skipped/unknown result when settlement evidence is insufficient;
- replay manifest including code SHA, Dataset Passport hash, feature version, strategy version, preset/config hash and seed.

## C. Edge Gate

Implement payout-aware research economics.

Given:
- ask price A;
- payout P;
- effective net return r = (P - A) / A;
- break-even probability p_be = A / P = 1 / (1+r).

When a leakage-safe calibrated empirical probability p_hat is available:
- probability edge = p_hat - p_be;
- EV per stake = p_hat * r - (1 - p_hat).

Rules:
- missing/stale/invalid proposal economics => monetary edge UNKNOWN;
- uncalibrated probability => no claim of probability edge;
- market-only replay can report directional metrics but not exact historical monetary expectancy;
- safety margin is configurable/research-derived and frozen from development/validation evidence before untouched test; never guessed from final test;
- an Edge Gate may emit PASS / FAIL / UNKNOWN with reason codes;
- Edge Gate never places orders.

Implement confidence intervals around hit rate and expectancy where statistically meaningful. Prefer deterministic seeded resampling and preserve temporal dependence where possible (e.g. moving/block bootstrap) rather than naive IID assumptions.

## D. Strategy Engine common contract

Implement the canonical strategy contract.

Input:
- strategy_id / version;
- runner_id;
- instrument;
- expiry 60/180/300;
- decision timestamp;
- immutable feature snapshot;
- market/provenance context;
- direction-specific proposal economics/freshness when available;
- preset/config version.

Output:
- SIGNAL_CALL / SIGNAL_PUT / NO_SIGNAL;
- strategy_id/version;
- runner_id;
- instrument;
- expiry;
- timestamp;
- featureSnapshotHash;
- quality/internal score;
- empirical probability only when calibrated;
- p_be when proposal known;
- estimated probability edge / EV only when valid;
- reason/no-signal codes;
- preset/config version.

Hard rules:
- deterministic;
- CALL/PUT symmetric where the strategy concept is symmetric;
- no direct imports from risk/execution/Deriv adapter;
- no knowledge of other strategy outputs;
- stale/gapped/untrusted input => NO_SIGNAL;
- insufficient history => NO_SIGNAL;
- no unrestricted user parameter mining in product-facing presets.

## E. Strategy 1 — Trend Pulse

Momentum / short-horizon continuation.

Candidate features:
- multi-window returns;
- robust regression/EMA slope;
- directional persistence;
- realized volatility;
- distance from adaptive anchor / range position;
- acceleration/deceleration;
- tick density;
- jump/anomaly flags.

Behavior:
- SIGNAL_CALL on validated bullish continuation state;
- SIGNAL_PUT on validated bearish continuation state;
- NO_SIGNAL on chop, conflicting windows, extreme volatility, one-tick jump, late extension, stale data, insufficient evidence.

Implement expiry-specific preset schemas for 60/180/300s. Initial values are research seeds only and MUST NOT be labeled validated until evidence passes.

## F. Strategy 2 — Mean Snapback

Short-horizon mean reversion.

Candidate features:
- robust z-score against adaptive mean/median;
- normalized range / band distance;
- RSI-like descriptive momentum;
- range/trend regime;
- extension velocity and deceleration;
- reversal micro-pattern;
- volatility band.

Reject:
- strong directional trend;
- active breakout/expansion;
- shock/jump;
- no reversal confirmation;
- stale or insufficient data.

CALL/PUT logic must mirror around the mean-reversion direction.

## G. Strategy 3 — Breakout Surge

Compression -> expansion breakout.

Candidate features:
- rolling high/low;
- compression percentile;
- volatility expansion ratio;
- breakout distance;
- directional persistence/hold;
- optional retest state;
- spike/jump filters.

Reject:
- no prior compression;
- weak breakout hold;
- immediate snapback;
- giant isolated spike;
- mature/late move;
- stale data.

## H. Strategy 4 — Anchor Pullback

Trend pullback to adaptive price anchor.

Use an Adaptive Price Anchor unless genuine volume exists.

Candidate features:
- trend direction/slope;
- prior trend persistence;
- distance from anchor;
- pullback depth/duration;
- rejection/reacceleration;
- trend flip/cross failure;
- volatility/trend regime.

Reject broken trend, overdeep pullback, no resumption, stale/anomalous data.

## I. Strategy 5 — Micro Pressure

Tick/microstructure pressure proxy.

Candidate features:
- signed tick-direction imbalance;
- run statistics;
- tick arrival rate;
- price change per tick;
- directional efficiency;
- micro-bursts;
- gaps/staleness/outliers.

Do NOT call this full Order Flow unless genuine bid/ask/trade/book data is later available.
No invented volume, delta or order-book imbalance.

## J. Presets and bounded research search

For each strategy + expiry:
- define typed preset schema;
- provide conservative seed preset(s);
- define bounded parameter search space;
- record every tried variant/config in a research ledger;
- enforce a maximum variant budget per research run;
- never tune on untouched final test;
- preserve stable seeds/config hashes.

Search may use grid/random/bayesian-like methods only if deterministic/reproducible and bounded. Do not add heavyweight ML infrastructure unnecessarily.

## K. Calibration

Implement a calibration framework for strategy probability estimates.

Requirements:
- calibration fit only on allowed chronological development/validation data;
- never fit on final untouched test;
- support a simple deterministic method such as reliability bins / isotonic / logistic calibration where statistically adequate;
- profiles with insufficient calibration evidence return probability = null;
- report Brier score, log loss where valid, reliability buckets and calibration slope/intercept or equivalent diagnostics;
- probability estimates are optional until evidence justifies them.

Do not fake p_hat from internal heuristic quality scores.

## L. Quant Lab research pipeline

Implement:
Dataset Passport
-> DQG
-> chronological split
-> baseline
-> feature generation
-> bounded parameter search on development folds
-> rolling/nested walk-forward validation
-> untouched OOS test
-> sensitivity map
-> payout/latency stress
-> Monte Carlo / sequence-risk analysis
-> prospective proposal-aware evaluation when data exists
-> research verdict.

Profile states:
DRAFT
RESEARCHING
OOS_PASSED
PROSPECTIVE_VALIDATION
DEMO_VALIDATION
ENABLED
REJECTED
SUSPENDED
RETEST_REQUIRED

WP-03 MUST NOT move a profile to ENABLED. Maximum permitted automatic state in this package is PROSPECTIVE_VALIDATION. DEMO_VALIDATION/ENABLED require WP-04 evidence.

## M. Anti-leakage / split guard

Implement code-level guards:
- chronological dev / validation / untouched test ranges cannot overlap;
- final test partition is read-only for model/parameter selection;
- derived features cannot consume timestamps beyond decision time;
- calibration/search receives only permitted folds;
- re-running after viewing final-test results must create a new research cycle/version rather than silently retuning against that same test.

Record all variant attempts to prevent cherry-picking.

## N. Metrics

Per Runner profile report:
- trade/signal count;
- NO_SIGNAL count/reasons;
- win/loss/flat/unknown counts;
- hit rate + confidence interval;
- average known effective payout;
- average break-even probability;
- expectancy per stake where proposal-aware evidence exists;
- expectancy confidence interval;
- max drawdown;
- longest loss sequence;
- PnL/return distribution;
- profit factor where meaningful;
- Brier/log loss/calibration diagnostics;
- OOS degradation;
- instrument/session/regime breakdown;
- parameter sensitivity;
- payout stress;
- proposal-freshness/latency stress;
- data-quality coverage;
- unknown/insufficient-evidence fraction.

No universal win-rate target.

## O. Robustness & stress

Implement deterministic research tests for:
- parameter neighborhood perturbation;
- payout deterioration;
- proposal latency/freshness delays;
- data gaps / tick thinning;
- higher transaction/economic assumptions where applicable;
- regime segmentation;
- instrument removal / concentration;
- sequence reshuffling via seeded block/bootstrap method;
- worst drawdown and loss-cluster analysis.

Reject knife-edge profiles.

## P. Baselines

Every family must compare against at least:
- no-skill payout break-even benchmark;
- one simple family-relevant baseline;
- direction-frequency / naive persistence or mean-reversion baseline where meaningful.

A complex strategy should not receive a positive research verdict merely for beating zero if a much simpler baseline performs similarly.

## Q. Multi-Runner portfolio research simulator

Implement a pure research simulator that consumes immutable strategy signals without changing them.

Model:
- selected Runner set;
- fixed stake;
- global max simultaneous orders;
- max per instrument;
- no delayed stale queue;
- signal collisions;
- overlapping expiries;
- cooldown;
- daily stop/optional target;
- shared slot exhaustion;
- deterministic signal-ready ordering;
- correlated loss clusters.

Do NOT import the production Risk Engine because WP-04 has not implemented it yet. Use a versioned research-only policy schema that can later be cross-checked against Risk Engine rules.

Metrics:
- portfolio expectancy/PnL where economics known;
- drawdown;
- slot utilization;
- blocked-by-slot count;
- blocked-by-instrument count;
- simultaneous exposure;
- worst overlapping-loss cluster;
- Runner contribution;
- instrument/session concentration;
- fairness/starvation telemetry.

No strategy confluence/voting.

## R. Research artifacts & CLI

Provide practical commands/scripts for:
- dataset inspection;
- single-profile replay;
- strategy-family batch replay;
- all 15 profile research matrix;
- sensitivity/stress run;
- portfolio multi-Runner simulation;
- machine-readable manifest + human-readable summary generation.

Prefer npm workspace scripts / TypeScript CLI.
Do not introduce Python as a required production/research runtime unless a documented blocker proves it necessary.

Large generated datasets/run outputs remain local and gitignored.
Commit small deterministic fixtures and compact summary/evidence only.

## S. Integration with WP-02

Use existing:
- direction-specific Opportunity identity;
- normalized MarketTick / ProposalQuote;
- Dataset Passport;
- DQG;
- Parquet/DuckDB;
- scanner freshness and proposal semantics.

Research code may consume captured files but MUST NOT start broker network activity during deterministic CI.

## T. Required tests

At minimum:
- deterministic replay produces byte/stable-equivalent manifest and identical decisions on repeat;
- no-lookahead property tests;
- chronological split overlap rejection;
- final-test mutation/tuning rejection;
- feature calculations use only past/current data;
- feature hashes stable;
- shared feature computation reused across multiple Runners on same symbol/time;
- CALL/PUT direction symmetry tests where applicable;
- every strategy exercises SIGNAL_CALL, SIGNAL_PUT and NO_SIGNAL fixtures;
- stale/gapped/untrusted input always NO_SIGNAL;
- missing proposal => monetary edge UNKNOWN;
- Edge Gate formulas exact;
- calibrated/un-calibrated behavior separated;
- market-only run cannot claim payout-aware expectancy;
- proposal-aware run uses only proposal available at decision time;
- settlement evidence UNKNOWN on insufficient future tick;
- each expiry profile isolated/versioned;
- parameter search never touches final test;
- variant ledger records all attempts;
- sensitivity/robustness outputs deterministic;
- portfolio simulator obeys global slots/per-instrument cap/no stale queue;
- simultaneous signals use deterministic tie-break;
- no strategy imports risk/execution/Deriv adapter;
- no strategy cross-voting.

## U. Acceptance behavior in WP-03

The code implementation of all five strategy families and research pipeline is required.

Research verdicts depend on evidence:
- ACCEPT_CANDIDATE / OOS_PASSED only when actual evidence supports it;
- RETEST_REQUIRED when sample/prospective coverage is inadequate;
- REJECTED when evidence is negative/unstable;
- never fabricate ENABLED profiles merely to satisfy this Work Package.

If the repository lacks enough real proposal-aware history to prove a Runner, the correct outcome is an implemented engine with honest RETEST_REQUIRED / PROSPECTIVE_VALIDATION states and reproducible instructions for accumulating evidence.

## Explicitly out of scope

- buy/sell;
- authenticated trading;
- production Risk Engine;
- order lifecycle / reconciliation;
- demo broker execution;
- live money;
- product UI;
- UGAS visual work;
- billing/SaaS;
- claiming profitability.

## Required validation

At minimum:
- npm ci;
- check:eol;
- check:deps;
- check:cycles;
- lint;
- typecheck;
- full unit/integration tests;
- deterministic replay tests;
- DuckDB/Parquet research integration tests;
- strategy matrix fixtures;
- anti-leakage tests;
- portfolio simulation tests;
- build;
- web build regression;
- Trader health regression;
- npm audit high;
- git diff --check;
- product CI;
- governance CI.

Optional real-data research may run locally from existing captured datasets, but deterministic CI must not depend on external Deriv availability.

## Evidence

Create:
.engineering/evidence/DT-WP-03-QUANT-STRATEGY.md

Record:
- base checkpoint/main SHA;
- branch/head SHA;
- dependency additions;
- dataset/passport hashes used;
- strategy versions/preset versions;
- total tests;
- replay determinism proof;
- anti-leakage proof;
- strategy profile research matrix;
- which metrics are market-only vs proposal-aware;
- calibration availability/limitations;
- sensitivity/stress results;
- multi-Runner simulation evidence;
- CI run IDs;
- exact list of any OOS_PASSED / RETEST_REQUIRED / REJECTED profiles;
- explicit statement that no profile was moved to ENABLED;
- unresolved warnings/deviations.

## Review

APPROVED / CORRECTION_REQUIRED / BLOCKED

## STOP CONDITION

Stop only when:
1. the complete Shared Feature Graph, deterministic replay/backtest engine, Edge Gate, five strategy families, expiry-specific Runner profile system, calibration framework, Quant Lab validation pipeline and multi-Runner research simulator are implemented;
2. deterministic/offline CI is green;
3. no-lookahead/final-test guards are proven;
4. every strategy has CALL/PUT/NO_SIGNAL deterministic fixtures;
5. all research outputs distinguish market-only from proposal-aware evidence;
6. any profile verdict is evidence-based and no unproven profile is called ENABLED/profitable;
7. no strategy/risk/execution/live-money boundary is violated;
8. evidence is complete;
9. governed PR is opened and left UNMERGED for ChatGPT exact-head review.
