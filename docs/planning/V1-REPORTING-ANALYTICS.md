# V1 Reporting & Analytics

## Report periods
Preset filters: 1 day, 2 days, 7 days, 15 days, 30 days.
Custom range: user chooses start date and end date.

## Report contents
Every report can include:
- period summary;
- net PnL;
- gross profit/loss;
- total stake/invested;
- total returned;
- order count;
- win/loss count;
- win rate;
- average stake;
- average payout;
- max drawdown;
- consecutive win/loss sequences;
- selected strategy;
- instrument breakdown;
- expiry breakdown;
- day/hour breakdown;
- risk-stop events;
- skipped/blocked orders by reason;
- scanner/API availability notes where relevant.

## Filters
- date range;
- strategy;
- instrument;
- expiry;
- result: win/loss/open/cancelled/error;
- demo/live environment when live exists in the future.

## Output formats
V1 should support on-screen report and export-ready data. Preferred deliverables:
- PDF summary report;
- CSV detail export;
- future: XLSX.

## Data sources
Primary canonical source: Deriv Trader reconciled event/audit database.
Broker enrichment/verification can use authenticated account endpoints such as profit_table and statement when available and permitted.

## Reconciliation rule
A report must never silently mix unreconciled local events with broker-confirmed outcomes. Every record should carry reconciliation status.

## Performance requirement
Common periods (today/7d/15d/30d) should be served from indexed aggregates/cache where useful, while retaining drill-down to raw reconciled events.
