# V1 Startup & Shutdown Contract

## Startup sequence
1. load app/build configuration;
2. initialize logging;
3. validate local data paths;
4. initialize Supabase/auth client;
5. restore/validate worker binding;
6. initialize SecretStore;
7. initialize operational DB access;
8. restore risk state/open-order records;
9. reconcile unresolved broker state;
10. initialize Deriv connection if configured;
11. start market subscriptions/scanner;
12. restore desired Runner states only after risk/reconciliation trust is established;
13. expose READY status.

## Fail-closed
If open-order/risk/identity state is ambiguous, worker enters DEGRADED or BLOCKED and accepts no new economic orders.

## Graceful shutdown
1. stop new Runner admissions;
2. stop scanner scheduling new proposal work;
3. flush audit/events;
4. persist recoverable runtime state;
5. do NOT abandon open-order reconciliation metadata;
6. close broker connections;
7. mark worker stopped.

## Crash recovery
Restart never assumes previous slots/orders disappeared. Broker reconciliation reconstructs truth before new admissions.
