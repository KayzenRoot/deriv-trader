# V1 Risk Engine Test Matrix

Mandatory tests:
1. daily loss threshold reached exactly during concurrent signal race;
2. five-slot cap with six or more concurrent signals;
3. max_open_exposure stricter than slot cap;
4. max_orders_per_instrument race;
5. consecutive-loss threshold reached;
6. target-stop enabled and reached;
7. target-stop disabled;
8. Stop All while signals are pending;
9. Kill Switch during in-flight broker call;
10. stale proposal after risk admission but before purchase;
11. duplicate idempotency key;
12. timezone/reset-boundary transition;
13. system restart while DAILY_STOPPED;
14. Loss Cascade Brake transition NORMAL -> CAUTION -> THROTTLED -> PAUSED;
15. LCB recovery cooldown;
16. API rate-budget rejection after slot reservation;
17. risk-store/database unavailable -> fail closed;
18. config mutation while Runners are active;
19. manual reduction of max simultaneous orders below current open count -> no forced close, but no new admissions;
20. open order resolves after Stop All -> reconciliation still completes.

Pass invariant: no test may produce an untracked order or exceed configured admission limits.
