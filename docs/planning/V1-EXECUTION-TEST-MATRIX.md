# V1 Execution Test Matrix

Mandatory scenarios:
1. clean signal -> risk admission -> fresh proposal -> buy -> open -> settle;
2. payout falls below threshold after risk admission -> skip and release slot;
3. proposal becomes stale before buy -> skip/re-evaluate;
4. buy call returns explicit rejection -> no duplicate retry;
5. buy call times out/ambiguous -> reconcile before any retry;
6. disconnect after buy but before response -> broker reconciliation finds order;
7. process restart with open contract -> recover and track settlement;
8. duplicate idempotency key -> one economic order only;
9. daily stop activates after slot reservation but before buy -> defined atomic policy enforced;
10. Stop All while open contracts exist -> no new entries, existing contracts still reconciled;
11. slot reservation leak simulation -> watchdog/reconciliation repairs state;
12. broker reports unknown contract state -> fail closed for duplicate execution;
13. simultaneous Runners submit at slot boundary -> cap never exceeded;
14. settlement event duplicated/out-of-order -> accounting remains correct;
15. clock skew/freshness boundary -> stale data rejected.

Pass invariant: zero untracked economic actions and deterministic exposure accounting.
