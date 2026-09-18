# Requirements
Status: PLANNING / DT-PLAN-0001.

- LOCAL-FIRST, FREE-FIRST, HIGH_ASSURANCE.
- Supabase Auth identity; per-user Deriv connection; SecretStore.
- Demo/paper before live.
- Scanner must consider the full currently active/supported instrument universe, subject to user allow/block filters.
- active symbol state and contract capability must be derived from current Deriv API evidence, not hard-coded symbol lists.
- 1m/3m/5m Runner eligibility is determined independently from current contract support.
- Market ticks/subscriptions are shared across Runners wherever safe.
- Payout eligibility uses fresh actual proposal economics and default minimum effective net payout >=80%.
- Proposal scanning must preserve API budget for execution/reconciliation and respect current documented limits.
- Subscription/reuse/backoff preferred over aggressive polling.
- Every order-capable decision requires fresh market, capability and payout state.
- Reconnect must invalidate stale authority until fresh state is re-established.
- Multiple concurrent Strategy Runners supported with no cross-strategy confluence.
- Global Risk Engine arbitrates every economic action.
- Complete decision/execution/risk/audit trail mandatory.
- No committed secrets.
- Exact-head evidence binding.
- Live-money remains outside V1 acceptance.
