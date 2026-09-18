# Decisions Ledger
ADR-0001 ACCEPTED: GEF Bootstrap V1 evidence-first lifecycle governs Deriv Trader.
ADR-0002 ACCEPTED: Git is canonical; Hive V1 is a context accelerator/memory layer and cannot override repository truth.
ADR-0003 ACCEPTED: money-moving/trading increments are HIGH_ASSURANCE.
ADR-0004 ACCEPTED: research/demo validation precede any live-money implementation or profitability claim.
ADR-0005 ACCEPTED: GEF V1 remains a separate source workspace; this repo adopts governance artifacts/contracts rather than vendoring the complete GEF implementation.
ADR-0006 SUPERSEDED: earlier one-active-strategy model replaced by ADR-0011.
ADR-0007 ACCEPTED: V1 uses Deriv Trader's own strategy runtime.
ADR-0008 ACCEPTED: internal filters inside one strategy are allowed; cross-strategy confluence is not required.
ADR-0009 ACCEPTED: strategy internals are versioned validated presets.
ADR-0010 ACCEPTED: payout/break-even use actual proposal economics.
ADR-0011 ACCEPTED: multiple concurrent Strategy Runners; one Runner = one strategy + one expiry.
ADR-0012 ACCEPTED: signals blocked by full slot capacity are not blindly queued.
ADR-0013 ACCEPTED: duplicate identical Runners are prevented.
ADR-0014 ACCEPTED: V1 architecture is LOCAL-FIRST and FREE-FIRST.
ADR-0015 ACCEPTED: Supabase Free is the preferred early operational Postgres/Auth cloud foundation.
ADR-0016 ACCEPTED: high-frequency research data uses local Parquet + DuckDB.
ADR-0017 ACCEPTED: Redis is not mandatory in V1.
ADR-0018 ACCEPTED: Vercel Hobby is development/preview only under current terms.
ADR-0019 ACCEPTED: recurring infrastructure spend targets $0 during V1 development.
ADR-0020 ACCEPTED: Supabase Auth is the V1 identity provider.
ADR-0021 ACCEPTED: Deriv Trader identity and Deriv broker authentication are separate and per-user.
ADR-0022 ACCEPTED: local V1 prefers PAT + App ID; hosted SaaS prefers OAuth 2.0 + PKCE after current-doc verification.
ADR-0023 ACCEPTED: broker secrets are accessed only through SecretStore.
ADR-0024 ACCEPTED: connecting a real account never bypasses the REAL execution gate.
ADR-0025 ACCEPTED: new V1 code prefers the current Deriv Options API. Any legacy API use requires an explicit adapter exception with contract tests.
ADR-0026 ACCEPTED: public market-data and authenticated account-trading transports are separated. Authenticated Options WebSockets are acquired through the current account-specific short-lived OTP flow.
ADR-0027 ACCEPTED: Deriv API schemas are never consumed directly by strategies/UI; all payloads pass through typed normalization and Schema Drift Guard.
ADR-0028 ACCEPTED: request capacity is governed by an API Budget Manager with reserved capacity for execution/reconciliation.
