# V1 Market Data & Scanner Test Matrix

Mandatory scenarios:
1. active_symbols returns N symbols -> registry normalized correctly;
2. current/new field names parsed, unknown optional fields tolerated;
3. contracts_for capability changes -> eligibility updates without restart;
4. five Runners require same symbol -> one external tick subscription, multiple internal consumers;
5. tick gap -> Market Freshness Matrix marks affected symbol untrusted/stale;
6. reconnect -> subscriptions restored exactly once;
7. stale pre-reconnect proposal cannot execute;
8. payout crosses 80% upward -> eligibility transition emitted;
9. payout crosses below 80% -> Runner blocked before execution;
10. proposal field number|string compatibility handled safely;
11. proposal budget pressure -> low-priority refresh throttled before execution traffic;
12. API rate rejection -> backoff, telemetry, no retry storm;
13. user blocklist update while scanning -> immediate eligibility removal;
14. user allowlist narrowing -> scanner stops unnecessary work where safe;
15. unsupported 1m but supported 3m -> only matching Runner eligible;
16. Start All with many Runners -> no duplicate external subscriptions;
17. stale tick with fresh proposal -> fail closed;
18. fresh tick with stale proposal -> strategy may analyze, but economic execution blocked;
19. contracts registry TTL expires during healthy operation -> refresh safely;
20. malformed schema/payload -> adapter error, no unsafe default eligibility.

Pass invariant:
No order-capable candidate may be marked ELIGIBLE unless all required capability, payout and freshness gates are proven.
