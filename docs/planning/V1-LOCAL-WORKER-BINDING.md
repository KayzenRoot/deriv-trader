# V1 Local Worker Binding

Internal concept: Local Worker Binding (LWB)

## Problem
The user authenticates to Deriv Trader through Supabase, while the actual trading-critical worker runs locally and may continue running even when the dashboard tab is closed.

The worker must know exactly which Deriv Trader user and execution profile it is authorized to operate for.

## V1 model
A local installation has one installation_id.
The authenticated user explicitly binds that installation to their account.

Binding record:
- worker_id / installation_id;
- user_id;
- app/build version;
- created_at;
- last_seen_at;
- revoked_at;
- allowed environment/capabilities.

## Authentication boundary
The browser session is not copied into logs or ordinary files.

The local app obtains a restricted worker session/capability through the trusted local backend flow. Long-lived local session material, when needed, is stored through the OS credential store, not localStorage.

## Safety rules
- one worker action is always attributable to one user_id;
- one order is always attributable to one deriv_connection_id and runner_id;
- revoked/expired binding stops new admissions;
- worker cannot switch users silently;
- changing the logged-in user requires explicit rebinding or profile selection;
- REAL capability remains blocked independently by governance.

## Offline/cloud outage behavior
The trading worker may continue only under a separately defined safe-local policy where identity, connection, risk state and broker state are already trusted and locally recoverable.
If authority/risk state cannot be proven, fail closed for new orders.

## SaaS evolution
Future hosted workers replace LWB with server-managed worker identity/capability, without changing domain ownership.
