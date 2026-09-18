# Requirements
Status: PLANNING / DT-PLAN-0001.

- Prefer official/documented APIs.
- Demo/paper before live.
- Supabase Auth provides V1 identity.
- user_id is the V1 ownership/tenant boundary.
- RLS/server authorization isolates each user's connections, profiles, Runners, orders, reports and analytics.
- Admin access is explicit/auditable and does not expose broker secrets.
- Each authenticated user configures their own Deriv connection.
- Local V1 supports PAT + App ID; future hosted web path may use OAuth 2.0 + PKCE.
- Broker secrets use SecretStore and never live plaintext in ordinary tables.
- Local Trader Worker must be explicitly bound to a user/installation and all actions attributable.
- Worker identity/revocation failure must fail closed for new admissions.
- Real account connection never enables live execution by itself.
- Multiple concurrent Strategy Runners supported.
- Global Risk Engine arbitrates all signals.
- Complete decision/execution/risk/audit trail mandatory.
- Operational DB must not be used indiscriminately for high-frequency raw research data.
- Schema migrations are versioned/reproducible in Git.
- No committed secrets.
- Exact-head evidence binding.
- Live-money remains outside V1 acceptance.
