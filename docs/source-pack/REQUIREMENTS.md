# Requirements
Status: PLANNING / DT-PLAN-0001.
- Prefer official/documented APIs for production paths.
- Demo/paper before live money.
- Reproducible data/backtests with provenance.
- Walk-forward and strict out-of-sample evaluation.
- Payout-aware expected value.
- Risk limits, kill switch, idempotent order handling and reconciliation.
- Complete decision/execution audit trail.
- No committed secrets.
- Exact-head test/evidence binding.
- Hive V1 is optional, health-checked and subordinate to Git.
- V1 exposes exactly five selectable strategy profiles.
- A user/profile may have only one active execution strategy at a time.
- Each strategy must show: canonical name, short plain-language summary, market conditions it follows, entry trigger family, supported expiry windows, and important limitations.
- Strategy selection must be explicit and user-controlled. The engine must not silently combine the five strategies into a mandatory confluence score.
- Risk and broker eligibility gates remain global and may block an order even when the selected strategy emits a valid signal.