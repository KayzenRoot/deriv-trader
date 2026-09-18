# V1 Stack Freeze

Verified against current official sources on 2026-09-18; Next.js line reconciled
against official sources on 2026-09-19 (CORRECTION 001, canonical reconciliation).

## Runtime
- Node.js 24 LTS line. Current official LTS patch observed: 24.21.0.
- npm 11.x bundled/currently compatible with Node 24.
- TypeScript 6.x line for V1 bootstrap, strict mode enabled.
Reason: TypeScript 7 is newly available; V1 favors the more mature transition line unless implementation compatibility testing proves 7.x is cleaner.

## Web
- Next.js 16.3.x Active LTS / security line (exact patch pinned in package-lock.json).
- React 19.2.x line.
- Tailwind CSS 4.3.x.
- Motion 13.x.
- Apache ECharts 6.1.x.

## Trader/API
- Fastify 5.12.x.
- WebSocket/client libraries selected from current maintained ecosystem during implementation.
- Zod-class runtime schema validation for internal/external DTO boundaries.

## Supabase
- @supabase/supabase-js 2.x.
- Supabase Auth + Postgres/RLS.
- No reliance on deprecated v1 clients.

## Research
- DuckDB 1.5.5 baseline.
- Parquet as canonical local analytical file format.

## Testing
- Vitest 5.0.x.
- Playwright 1.55.x.
- Node built-in test/diagnostic utilities may be used where simpler.

## Data access
- PostgreSQL migrations committed to Git.
- Prefer a lightweight typed SQL layer/Drizzle-class ORM rather than a heavy active-record abstraction.
- Exact package patch versions are locked in package-lock.json at bootstrap after compatibility checks.

## Versioning rule
Do not use unbounded "latest" ranges in package.json.
Use explicit compatible ranges and commit the lockfile.
Security patch updates are allowed through governed dependency update PRs.

## Why Active LTS over newest
Trading-critical software values predictable support/security behavior over novelty. New Current releases can be evaluated later after contract/regression tests.

## Source verification notes
Current official references observed:
- Node 24.21.0 is LTS; Node 26 is Current.
- Next.js: 16.x is Active LTS per https://nextjs.org/support-policy; the August
  2026 security release (https://nextjs.org/blog/august-2026-security-release,
  published August 25th 2026) instructs users to upgrade to 16.3.3 (Active LTS)
  to address two Critical vulnerabilities (including GHSA-p293-qw3h-jr36 and
  GHSA-2xp9-vwfh-vxw4). V1 therefore accepts the current 16.3.x Active
  LTS/security line with the exact patch pinned in package-lock.json (16.3.5 at
  CORRECTION 001, newer than the instructed 16.3.3 within the same line).
- React 19.3 is latest, but V1 intentionally stays on the mature 19.2 line with Next Active LTS.
- Tailwind CSS 4.3 is current published major/minor.
- Fastify docs show latest 5.12.5.
- Vitest 5.0 released 2026-09-03.
- Playwright docs show 1.55 release line.
- DuckDB 1.5.5 is the latest released 1.5 patch before planned 1.5.6.
- Apache ECharts 6.1.0 is current published release.
