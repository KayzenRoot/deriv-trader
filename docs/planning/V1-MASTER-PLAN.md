# Deriv Trader V1 Master Plan

Status: PLANNING
Goal: ship a deliberately short, high-quality first version quickly, validate the core product, then iterate.

## V1 product promise
The user selects one or more Strategy Runners. Each Runner is one validated strategy + one expiry profile: 1m, 3m or 5m. All started Runners scan the same eligible market universe independently and may open orders automatically when their own rules, payout/eligibility checks and global risk gates pass.

Example:
- Trend Pulse · 1m
- Trend Pulse · 3m
- Trend Pulse · 5m
- Breakout Surge · 3m
- Anchor Pullback · 5m

These are five independent Runners, even though only three strategy families are represented.

## V1 pillars
1. Premium glassmorphism operator UI with Deriv Trader identity produced through UGAS.
2. Market scanner over currently active/tradable instruments.
3. Dynamic payout/eligibility filter, default minimum 80%.
4. Five strategy families with independent 1m/3m/5m profiles.
5. Multiple concurrently active Runners with explicit start/stop controls.
6. Global configurable simultaneous-order cap across all Runners.
7. Strong configurable Risk Engine.
8. Demo/paper-first execution and complete auditability.
9. Admin panel and SaaS-ready foundations.

## Non-negotiables
- No mandatory confluence among Runners.
- No blind delayed execution when order slots are full.
- No martingale default.
- No profitability claim without Deriv-specific OOS/demo evidence.
- No bypassing broker/API limits.
- Live-money remains gated.
