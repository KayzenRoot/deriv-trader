# V1 User Flows

## First-run / operator flow
1. Open Deriv Trader.
2. Confirm environment banner: DEMO/PAPER by default.
3. Open Strategy Selection.
4. Read the five strategy cards and select exactly one.
5. Configure payout minimum, expiries (1m/3m/5m), stake and risk limits.
6. Start scanner.
7. Dashboard shows eligible instruments and selected-strategy signal state.
8. Valid signal passes through global risk/broker gates.
9. Demo order is opened or skipped with an explicit reason.
10. User can pause/kill new entries at any time.

## Daily operation
Overview -> confirm risk budget -> confirm selected strategy -> scanner active -> inspect signals/orders -> monitor daily stop/target -> stop or let limits stop entries automatically.

## Strategy change
Pause new entries if required -> choose another strategy -> review description/limitations -> confirm explicit change -> audit event -> new signals use only the new strategy. Existing contracts are not retroactively reassigned.

## Safety UX
The UI must always show: environment, selected strategy, payout threshold, enabled expiries, stake, remaining daily risk budget, simultaneous-order usage, scanner health, API health and kill-switch state.
