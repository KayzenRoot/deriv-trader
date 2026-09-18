# Evidence Bundle · DT-PLAN-0001
Status: COLLECTING
Planning base: DT-CP-0003
Scope class: product/system planning only.

Current Deriv API planning was re-checked against official documentation on 2026-09-18.

Additional verified facts:
- current Options API documents a public read-only WebSocket without auth;
- authenticated Options WebSockets use an account-specific OTP/URL obtained through REST;
- OTP is currently documented as single-use and valid for 120 seconds;
- PAT-authenticated OTP REST requests require Deriv-App-ID;
- Deriv best practices recommend one reused/multiplexed socket, req_id correlation, subscription cleanup, exponential backoff + jitter and explicit error checks;
- current API has documented legacy/new breaking changes, reinforcing typed adapter normalization;
- OAuth reference documents Authorization Code + PKCE; workflow documentation references refresh-token handling, so renewal behavior will be re-verified at implementation rather than relying on an earlier static assumption.

Planning now includes Deriv Adapter, API Budget Manager, Schema Drift Guard, Error Taxonomy and contract-test plan.

No infrastructure provisioned, credentials handled or trading performed.
Pending: further planning iterations, final consistency audit, governance CI and exact-head review.
