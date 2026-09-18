# V1 Reporting & Analytics

## Periods
Today, 2d, 7d, 15d, 30d and custom date range.

## Report contents
- net PnL;
- gross profit/loss;
- total invested;
- total returned;
- order count;
- wins/losses;
- win rate;
- average stake;
- average payout;
- max drawdown;
- consecutive wins/losses;
- strategy family;
- exact Runner: strategy + expiry;
- instrument/expiry/time breakdowns;
- slot-cap blocks;
- risk stops;
- skipped signals by reason;
- scanner/API availability notes.

## Filters
Date range, strategy family, Runner, instrument, expiry, result, environment.

## Output
- on-screen report;
- PDF summary;
- CSV detail;
- future XLSX.

## Reconciliation
Never silently mix unresolved local events with broker-confirmed results. Every order carries reconciliation status.

## Multi-Runner attribution
All reports must distinguish the same strategy running at different expiries. Trend Pulse 1m and Trend Pulse 5m are separate analytical dimensions even though they share a strategy family.
