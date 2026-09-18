# Decisions Ledger
ADR-0001 ACCEPTED: GEF Bootstrap V1 evidence-first lifecycle governs Deriv Trader.
ADR-0002 ACCEPTED: Git is canonical; Hive V1 is a context accelerator/memory layer and cannot override repository truth.
ADR-0003 ACCEPTED: money-moving/trading increments are HIGH_ASSURANCE.
ADR-0004 ACCEPTED: research/demo validation precede any live-money implementation or profitability claim.
ADR-0005 ACCEPTED: GEF V1 remains a separate source workspace; this repo adopts governance artifacts/contracts rather than vendoring the complete GEF implementation.
ADR-0006 SUPERSEDED: the earlier "one active strategy per profile" model is replaced by ADR-0011.
ADR-0007 ACCEPTED: V1 uses Deriv Trader's own strategy runtime. Deriv-hosted predefined automation endpoints are not the strategy brain of V1; they may be evaluated later as an optional execution/integration surface.
ADR-0008 ACCEPTED: internal filters/factors inside one strategy are allowed and required for quality. They are not cross-strategy confluence.
ADR-0009 ACCEPTED: strategy internals are versioned validated presets in V1. Users control runner selection, expiry/risk/execution settings; raw research parameters are not broadly exposed until a future expert-mode decision.
ADR-0010 ACCEPTED: effective payout and break-even probability are computed from actual proposal economics, never from a marketing label alone.
ADR-0011 ACCEPTED: V1 supports multiple concurrently active Strategy Runners. A Runner is exactly one strategy + one expiry profile. Multiple Runners may operate in parallel without cross-strategy confluence. Global risk, broker-safety and simultaneous-order limits arbitrate all Runners.
ADR-0012 ACCEPTED: when the global simultaneous-order cap is full, new signals are not queued for delayed execution. They are skipped/expired unless still valid and freshly re-evaluated after a slot becomes available.
ADR-0013 ACCEPTED: V1 prevents accidental duplicate Runners with the same strategy + expiry combination. Multiple different Runners may target the same instrument subject to user-configured per-instrument exposure limits.