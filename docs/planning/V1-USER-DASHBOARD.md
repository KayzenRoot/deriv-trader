# V1 User Dashboard — Complete Performance Center

The dashboard is both a performance center and the live operating cockpit.

## At-a-glance state
- current environment;
- active Runner count;
- Runner states by strategy + expiry;
- simultaneous slots used / total;
- open orders;
- scanner health;
- API health;
- payout threshold;
- fixed stake;
- daily risk remaining;
- kill-switch state;
- PnL today and selected period.

## Global date filter
Today, Yesterday, 2d, 7d, 15d, 30d and custom range.

## KPI strip
Net PnL, gross profit, gross loss, total invested, total returned, orders, wins, losses, win rate, average stake, average payout, max drawdown, balance when available, daily loss usage and target progress.

## Runner analytics
Dashboard must support:
- PnL by Runner;
- win rate by Runner;
- order count by Runner;
- average payout by Runner;
- results by strategy family;
- results by expiry;
- blocked signals by reason;
- slot-cap blocks;
- risk-stop events.

## Required charts
- cumulative PnL;
- daily PnL;
- invested amount/day;
- order count/day;
- win/loss;
- win-rate trend;
- drawdown;
- average payout;
- Runner performance comparison;
- expiry performance;
- instrument performance;
- hour/session performance;
- risk-budget usage;
- optional equity curve.

## Active Runner panel
Every active Runner shows:
- strategy name + expiry;
- RUNNING/PAUSED/ERROR;
- last signal;
- signals today;
- orders today;
- PnL today;
- latest blocker/reason;
- start/stop control shortcut.

## Drill-down
Every order exposes exact runner_id, strategy, expiry, stake, payout, result, PnL, timestamps, risk/slot decision, configuration version and replay/evidence reference.

## Motion
UGAS defines animated KPI counters, chart transitions, Runner state transitions, slot usage animations, scanner pulse and order lifecycle motion. Motion must never obscure safety state.

## Data integrity
Analytics derive from reconciled canonical events. Broker history enriches/verifies, but Runner attribution and internal risk/decision reasoning come from Deriv Trader.
