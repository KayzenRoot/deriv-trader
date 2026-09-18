# Requirements
Status: PLANNING / DT-PLAN-0001.
- Prefer official/documented APIs for production paths.
- Demo/paper before live money.
- Reproducible data/backtests with provenance.
- Walk-forward and strict out-of-sample evaluation.
- Payout-aware expected value.
- Multiple concurrent Strategy Runners are supported; each Runner is one strategy + one expiry.
- No mandatory cross-strategy confluence.
- Global Risk Engine arbitrates all Runner signals.
- User configures fixed stake, max stake, max simultaneous orders, max open exposure, max orders per instrument, daily max loss, optional daily target, max consecutive losses, cooldowns and operating windows.
- Risk state and hard-stop transitions must be atomic relative to order admission.
- Loss Cascade Brake may throttle/pause clustered-loss conditions without altering strategy direction.
- No stale blocked signal may be blindly queued and executed later.
- Complete decision/execution/risk audit trail is mandatory.
- No committed secrets.
- Exact-head evidence binding.
- Dashboard must expose risk state, slot usage, open exposure, drawdown and risk-block reasons.
- Reporting must attribute results to exact Runner and support today, 2d, 7d, 15d, 30d and custom periods.
- Live-money remains outside V1 acceptance.
