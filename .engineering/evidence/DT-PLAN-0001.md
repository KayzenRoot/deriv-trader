# Evidence Bundle · DT-PLAN-0001
Status: COLLECTING
Planning base: DT-CP-0003
Scope class: product/system planning only.

Identity/connection update verified against current official sources on 2026-09-18:
- Supabase Free currently includes 50K MAU and Supabase Auth supports password, magic link/OTP, social login and RLS integration.
- Privy current Developer Free tier covers 0-499 MAU; next published tier is $299/month for 500-2,499 MAU. Privy was therefore not selected for this non-wallet V1.
- Deriv currently supports OAuth 2.0 Authorization Code + PKCE and PAT authentication. Official guidance positions OAuth for web apps and PAT for desktop/native contexts.
- Deriv PAT REST auth currently requires Deriv-App-ID.
- Deriv OAuth token exchange must occur server-side and current docs show access tokens expiring after 3600 seconds; no undocumented refresh behavior is assumed.
- Supabase Vault is a candidate future hosted SecretStore because it stores secrets encrypted/authenticated at rest, but decrypted access must remain server-only/privileged.

Architecture decision: Supabase Auth for Deriv Trader identity; per-user Deriv connection in Settings; local PAT stored via OS credential store; future SaaS OAuth/Vault adapter. Real connection never bypasses the live gate.

No infrastructure provisioned, no credential handled, no trading performed.
Pending: further planning iterations, consistency audit, governance CI and exact-head review.
