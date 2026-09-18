# Deriv Trader V1 Master Plan

Status: PLANNING
Goal: ship a deliberately short, high-quality first version quickly, validate the core product, then iterate.

## V1 product promise
A user selects one of five strategy profiles, configures risk and execution preferences, and the system continuously scans currently tradable eligible instruments. Only opportunities with measured effective payout >= 80% and supported 1m/3m/5m expiries are eligible. The selected strategy alone evaluates entries. Global risk and broker-safety gates can still block execution.

## V1 pillars
1. Premium glassmorphism operator UI with Deriv Trader visual identity produced through UGAS.
2. Market scanner over currently active/tradable instruments.
3. Dynamic payout/eligibility filter, default minimum 80%, user-configurable upward.
4. Five individually selectable strategy profiles, exactly one active at a time.
5. 1m, 3m and 5m expiry targets, only where broker contract capabilities allow.
6. Strong configurable risk engine.
7. Demo/paper-first execution and complete auditability.
8. Admin panel and SaaS-ready foundations without building full billing/multi-tenancy yet.

## Non-negotiables
- No mandatory confluence of the five strategies.
- No martingale default.
- No profitability claim without Deriv-specific OOS/demo evidence.
- No bypassing broker/API limits.
- Live-money remains gated.
