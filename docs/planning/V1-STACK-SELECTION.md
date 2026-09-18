# V1 Stack Selection

## Monorepo
TypeScript monorepo with npm workspaces.

Proposed layout:
- apps/web
- apps/trader
- packages/domain
- packages/auth
- packages/connections
- packages/secret-store
- packages/deriv-adapter
- packages/strategies
- packages/risk
- packages/execution
- packages/research
- packages/db
- packages/ui
- packages/config
- packages/testing

## Web
Next.js + React + TypeScript + Tailwind + UGAS design assets/tokens + Motion + open-source charting.

## Identity
Supabase Auth.
Initial login: email/password or magic link/OTP.
Optional Google/social login can be enabled later without replacing the identity layer.

Why not Privy in V1:
- no need for embedded wallets/onchain signing;
- Supabase is already the DB platform;
- current Supabase Free Auth allowance is much larger than Privy's current free MAU tier.

## Deriv connection
Local: PAT + Deriv App ID configured by logged-in user in Settings.
Future web/SaaS: OAuth 2.0 + PKCE preferred when token lifecycle is implemented from then-current official docs.

## Secret storage
SecretStore interface.
- local adapter: Windows Credential Manager / OS keychain-class store;
- hosted adapter: Supabase Vault or equivalent server-side encrypted store.
Browser never receives stored secret after initial submission.

## Trader worker
Persistent local Node.js + TypeScript process for Deriv sockets, Scanner, Runners, Risk, execution/reconciliation and audit.

## Database
PostgreSQL / Supabase Free for operational data and connection metadata.
Typed migration/data layer selected in DT-ARCH-0001.

## Research
DuckDB + Parquet local.

## Cache/queue
In-process bounded queues/caches + durable Postgres events where needed.
No mandatory Redis.

## Reports/observability
Open-source PDF/CSV generation, structured JSON logs, health endpoints, local metrics and audit tables.
