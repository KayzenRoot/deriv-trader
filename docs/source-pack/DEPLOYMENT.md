# Deployment

## V1 default
LOCAL-FIRST.

The trading worker, scanner, Runners, Risk Engine, demo execution and research data run locally on the user's machine.

## Early cloud services
Supabase Free may provide operational Postgres/Auth/storage within its current free quotas.
Vercel Hobby may provide personal/non-commercial web previews only.

## Commercial boundary
Vercel Hobby current terms restrict use to personal/non-commercial purposes. Before Deriv Trader is sold or operated commercially on Vercel, upgrade to an eligible plan or migrate hosting.

## Future remote worker
A remote always-on trading worker is deliberately deferred until there is a proven need/revenue or a current free platform passes HIGH_ASSURANCE reliability tests. Free compute is never assumed reliable enough merely because it costs $0.

## Live
Research/test, demo/paper and live remain separate. Live is forbidden until a future HIGH_ASSURANCE Work Order and approval gate.

Every deployment must include secret management, health checks, rollback/roll-forward, version pinning, exact-head traceability and current-cost/quota evidence.
