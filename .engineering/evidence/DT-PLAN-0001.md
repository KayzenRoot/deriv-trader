# Evidence Bundle · DT-PLAN-0001
Status: COLLECTING
Planning base: DT-CP-0003
Scope class: product/system planning only.

Latest planning block adds the operational data model and future micro-SaaS ownership boundary:
- user_id is the V1 tenant/ownership key;
- Supabase Auth identity is separated from Deriv credentials;
- RLS/server authorization protects user-owned records;
- local worker installations are explicitly bound to a user;
- every order is attributable to user_id + deriv_connection_id + runner_id;
- admin APIs never expose plaintext broker secrets;
- raw high-frequency research data stays outside the small operational DB.

The V1 remains intentionally simple: no organizations/teams/billing machinery yet.

No infrastructure provisioned, credentials handled or trading performed.
Pending: further planning iterations, final consistency audit, governance CI and exact-head review.
