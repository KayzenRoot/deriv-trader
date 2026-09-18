# Evidence Bundle · DT-PLAN-0001
Status: COLLECTING
Planning base: DT-CP-0003
Scope class: product/system planning only.

Free-first architecture update verified against current official pricing/terms on 2026-09-18:
- Supabase Free: $0, 500 MB DB, 50K MAU, 5 GB egress, 1 GB storage, max 2 active projects, inactivity pause behavior disclosed.
- Vercel Hobby: $0 but current terms restrict Hobby to personal/non-commercial use; accepted only for development/preview.
- Upstash Redis Free exists (256 MB / 500K commands/month / 10 GB bandwidth) but is deliberately not core V1 due to likely high-frequency command pressure.
- Cloudflare Workers Free exists but is optional/future; not chosen as V1 trading brain.

Architecture is now LOCAL-FIRST: local Node trader worker, Next.js UI, Supabase/Postgres-compatible operational store, local Parquet + DuckDB research store and no mandatory Redis.

No infrastructure has been provisioned by this planning change. No implementation, credentials, trading or profitability claim.
Pending: further planning iterations, final consistency audit, governance CI, exact-head review and checkpoint delta.
