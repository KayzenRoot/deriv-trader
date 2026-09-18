# V1 Functional Modules

## M1 — Market Eligibility Scanner
Continuously discovers active/tradable instruments, supported contracts/expiries and current proposal economics. Shared market-data subscriptions/caches feed all Runners.

## M2 — Strategy Runner Manager
Shows five strategy families and independently selectable 1m/3m/5m profiles. Creates, starts, stops, pauses and displays multiple concurrent Runners.

## M3 — Multi-Runner Strategy Runtime
Runs every active strategy-expiry Runner independently against the eligible universe. Each emits SIGNAL_CALL, SIGNAL_PUT or NO_SIGNAL with full attribution.

## M4 — Global Risk & Order Slot Arbiter
Applies stake, daily loss stop, optional target, max simultaneous orders, per-instrument cap, consecutive-loss stop, exposure, cooldown and kill switch across all Runners.

## M5 — Execution / Demo Reconciliation
Demo/paper-first. Every order is tied to exact Runner, strategy version, expiry profile, config and market/proposal evidence.

## M6 — User Performance Dashboard
Complete command center with active Runner states, open-slot usage, KPI cards, charts, PnL, total invested, win/loss analytics, drawdown, payout analytics, scanner health and drill-down.

## M7 — Reporting & Historical Analytics
Preset/custom periods with breakdown by strategy, Runner, expiry, instrument and time.

## M8 — Configuration Center
Controls global payout, stake, simultaneous-order cap, risk, per-instrument cap, Runner selection, assets, operating windows and notifications.

## M9 — Admin Panel
Users, feature flags, strategy/Runner availability, defaults, system health, audit logs, job/scan monitoring and future SaaS controls.

## M10 — Audit & Evidence
Event trail for config changes, Runner start/stop, strategy decisions, risk/slot decisions, proposals, order lifecycle, reconciliation and errors.
