# V1 User Flows

## First-run
1. Open Deriv Trader.
2. Confirm DEMO/PAPER environment.
3. Configure fixed stake and global risk limits.
4. Set maximum simultaneous open orders.
5. Open Strategy Runners.
6. Select any desired strategy + expiry combinations.
7. Press Start Selected or Start All.
8. All active Runners begin scanning independently.
9. Signals pass through global risk/order-slot/broker gates.
10. Orders open automatically when admitted.
11. User can stop individual Runners, Stop All or use kill switch.

## Example
User chooses:
- Strategy 1 at 1m
- Strategy 1 at 3m
- Strategy 1 at 5m
- Strategy 3 at 3m
- Strategy 4 at 5m
Global max simultaneous orders = 5.

The system runs five independent Runners and never exceeds five total open orders.

## Daily operation
Overview -> confirm risk/slot budget -> review active Runners -> Start All -> monitor scanner/signals/orders -> automated stops or manual Stop All/Kill Switch.

## Runner change
A Runner can be stopped/started without stopping unrelated Runners. Existing open orders retain their original Runner attribution.

## Safety UX
Always show environment, active Runner count, each Runner status, payout threshold, fixed stake, simultaneous slots used/total, remaining daily risk budget, scanner/API health and kill-switch state.
