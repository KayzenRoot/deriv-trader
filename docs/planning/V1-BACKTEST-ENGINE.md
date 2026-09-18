# V1 Backtest & Replay Engine

## Objective
Reproduce strategy decisions deterministically on historical/prospectively captured market data with enough fidelity to reject weak ideas before demo execution.

## Two evidence modes
### Market-only historical replay
Uses historical tick/candle data to test signal logic and directional outcomes. It MUST NOT pretend exact historical payout economics are known unless proposal economics were actually captured.

### Proposal-aware replay
Uses prospectively captured proposal snapshots containing ask_price, payout, timestamps and contract metadata. This is the preferred evidence mode for actual expectancy and payout-aware acceptance.

## Replay fidelity
Every simulated decision binds:
- market-data snapshot/provenance;
- strategy Runner/version;
- expiry profile;
- parameter preset;
- proposal/payout snapshot when available;
- execution timestamp assumption;
- result label;
- configuration hash.

## Anti-lookahead
Feature calculations must use only information available at the simulated decision time. Derived bars/windows close only when their timestamps permit.

## Execution assumptions
Backtests must model at minimum:
- decision-to-proposal timing;
- proposal freshness;
- payout variability;
- skipped trades when payout < configured threshold;
- unavailable/closed contracts;
- latency sensitivity;
- rejected or stale proposal scenarios where evidence supports simulation.

## Outputs
The engine produces machine-readable run manifests and human-readable summaries. Identical manifest + data + code must reproduce the same results.
