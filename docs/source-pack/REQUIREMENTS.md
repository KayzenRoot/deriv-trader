# Requirements
Status: PLANNING / DT-PLAN-0001.

- LOCAL-FIRST, FREE-FIRST, HIGH_ASSURANCE.
- Supabase Auth provides V1 identity; user_id is the ownership boundary.
- USER and ADMIN are the only V1 roles.
- RLS/server authorization isolate user-owned data.
- Admin cannot reveal broker secrets, bypass Risk, or bypass the live-money gate.
- High-risk admin actions require audit identity, reason and confirmation.
- Local Trader Worker binds to localhost by default and owns trading authority.
- Browser/UI cannot access SecretStore or place broker orders directly.
- Each user configures their own Deriv connection.
- Multiple Strategy Runners may operate concurrently.
- Global Risk Engine arbitrates every economic action.
- Demo is the default environment; real remains system-gated.
- In-app notifications are mandatory for connection, worker, Runner, risk, order, schema, storage and security events.
- Critical alerts persist until resolved/acknowledged.
- Notification noise must be deduplicated/rate-controlled.
- Common operator actions should be reachable quickly and critical state visible globally.
- Complete decision/execution/risk/security audit trail mandatory.
- No committed secrets.
- Exact-head evidence binding.
- Live-money remains outside V1 acceptance.
