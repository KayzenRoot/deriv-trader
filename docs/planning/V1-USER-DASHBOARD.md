# V1 User Dashboard — Complete Performance Center

The user dashboard is a complete operational and performance center, not a lightweight status page.

## Primary goals
The user must understand, at a glance:
- current account/environment state;
- profit/loss today and selected period;
- number of orders opened;
- total amount invested;
- average amount per order;
- winning and losing orders;
- win rate;
- net PnL;
- gross profit and gross loss;
- current drawdown;
- current daily risk budget remaining;
- selected strategy;
- active payout threshold;
- enabled expiry windows;
- currently open orders;
- scanner health and eligible opportunities.

## Global date filter
Every analytics component must react to one shared period selector:
- Today
- Yesterday
- Last 2 days
- Last 7 days
- Last 15 days
- Last 30 days
- Custom date range
- Future extension: month-to-date / all-time

Custom date ranges must be timezone-aware and show the exact start/end period used.

## Top KPI strip
Required cards:
1. Net profit/loss
2. Gross profit
3. Gross loss
4. Total invested
5. Total returned/payout received
6. Orders opened
7. Winning orders
8. Losing orders
9. Win rate
10. Average stake
11. Average payout
12. Max drawdown for period
13. Current balance when broker/account data is available
14. Daily loss limit usage
15. Daily target progress when configured

Each KPI must expose comparison versus the immediately preceding equivalent period where meaningful.

## Required charts
- cumulative PnL over time;
- profit/loss by day;
- invested amount by day;
- order count by day;
- wins vs losses;
- win rate trend;
- drawdown curve;
- average payout trend;
- strategy result history for the selected strategy;
- results by expiry: 1m / 3m / 5m;
- results by instrument;
- results by hour/session;
- risk-budget usage;
- optional equity/balance curve when reliable account balance snapshots exist.

## Activity panels
- current open orders;
- most recent closed orders;
- recent signals;
- recent risk blocks;
- recent configuration changes;
- system/API health;
- scanner freshness;
- alert center.

## Drill-down
Clicking a KPI, chart point, instrument, day or order should open contextual detail where useful:
- order ID;
- instrument;
- direction;
- strategy;
- expiry;
- stake;
- offered payout;
- result;
- net PnL;
- timestamps;
- decision/risk reason;
- configuration version;
- evidence/replay reference when available.

## Visual and motion
UGAS must provide the visual language for:
- animated KPI counters;
- smooth chart transitions;
- glass panels;
- hover/focus detail;
- skeleton loading;
- subtle scanner pulse;
- order lifecycle animation;
- success/loss/risk-state transitions;
- empty/stale/error states.

Animations must be restrained, performant and must never delay or obscure safety-critical state.

## Data integrity
Dashboard analytics are derived from Deriv Trader's own reconciled audit/event store. Broker account endpoints may enrich/verify account history, but strategy attribution, risk-block reasons and configuration-version reporting come from our own canonical records.
