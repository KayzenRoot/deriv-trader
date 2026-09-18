# V1 Functional Modules

## M1 — Market Eligibility Scanner
Continuously discovers currently active/tradable instruments, supported contract/expiry capabilities and current proposal economics. Uses subscriptions/caching where supported instead of aggressive polling.
Outputs per instrument: tradable state, display name, contract support, eligible expiry windows, effective payout estimate, eligibility reason, freshness timestamp.

## M2 — Strategy Selector
Shows five strategy cards. Exactly one strategy can be active per user/profile. Selection changes are explicit and audited.

## M3 — Selected Strategy Runtime
Runs only the chosen strategy against all eligible instruments. Emits SIGNAL or NO_SIGNAL with reason, confidence/quality metadata and expiry candidate.

## M4 — Risk & Safety Engine
Applies user limits after a valid strategy signal and before any order: stake, daily loss stop, optional daily target, max simultaneous orders, max orders per instrument/session, consecutive-loss stop, cooldown, exposure and kill switch.

## M5 — Execution / Demo Reconciliation
V1 targets demo/paper validation first. Every order lifecycle is reconciled against broker state and tied to strategy/config/data snapshot.

## M6 — User Performance Dashboard
Complete command center with real-time operational state, KPI cards, charts, period comparison, open/recent orders, PnL, total invested, win/loss analytics, drawdown, payout analytics, scanner health, risk usage and drill-down.

## M7 — Reporting & Historical Analytics
Preset and custom periods, report generation, instrument/expiry/time breakdowns, risk-event analysis, PDF summary and CSV detail export.

## M8 — Configuration Center
User controls payout threshold, stake, expiry windows, risk limits, strategy selection, asset allow/block lists, operating windows and notifications.

## M9 — Admin Panel
Users, feature flags, strategy availability, global defaults, system health, audit logs, job/scan monitoring and future SaaS controls.

## M10 — Audit & Evidence
Immutable-style event trail for config changes, strategy selection, signal decision, risk decision, proposal economics, order lifecycle, reconciliation and errors.