# Project Overview

Deriv Trader V1 is a deliberately short, research-first automated trading product intended to reach a usable demo/paper validation state quickly while preserving HIGH_ASSURANCE controls.

The user may activate multiple independent Strategy Runners concurrently. Each Runner is one validated strategy family + one validated expiry profile (1m, 3m or 5m). All active Runners scan the same currently eligible market universe through shared market data, while the Global Risk Engine and Order Slot Arbiter enforce system-wide limits.

The platform dynamically filters by measured effective payout (default minimum 80%), current Deriv contract capability, market/proposal freshness and user configuration before any Runner can produce an executable signal.

The V1 includes a premium UGAS-produced glassmorphism identity, complete user performance dashboard, Scanner, Strategy Control Center, configurable Risk Center, Orders/Reconciliation, Analytics/Reports, per-user Deriv connection settings, Admin, System Health and future micro-SaaS-ready ownership boundaries.

V1 is LOCAL-FIRST and FREE-FIRST. Trading-critical compute runs locally during research/demo; Supabase Free is the preferred operational Postgres/Auth foundation; high-frequency research data remains local in Parquet + DuckDB.

No strategy profitability, live-money readiness or regulatory suitability is claimed until separately proven. Live execution is outside the V1 Definition of Done and requires a future explicit HIGH_ASSURANCE go-live gate.
