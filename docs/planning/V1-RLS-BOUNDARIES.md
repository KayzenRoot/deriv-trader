# V1 Row-Level Security & Ownership Boundaries

## Principle
Database isolation is enforced server-side through ownership/RLS, not only by frontend filtering.

## User policies
A normal authenticated user can read/write only records owned by their own user_id, directly or through an owned parent resource.

Examples:
- own profile;
- own Deriv connection metadata;
- own execution/risk profiles;
- own Runners;
- own signals/orders/history;
- own reports.

## Admin policies
Admin access is explicit, role-checked and auditable.

Admin may:
- inspect users/status;
- inspect non-secret connection health metadata;
- inspect system/risk/order telemetry;
- manage feature flags/strategy availability.

Admin may NOT receive plaintext broker credentials through normal admin APIs.

## Indirect ownership
Tables such as strategy_runners and risk_profiles inherit ownership through execution_profile.
Policies must validate the parent relationship, not trust a client-supplied user_id.

## Service/backend access
Privileged backend credentials are server-only.
Never expose Supabase service-role credentials to browser code or the local UI bundle.

## Deletion
Deleting/disconnecting a user-owned Deriv connection must follow dependency checks and revoke/retire its SecretStore reference without orphaning active executions.
