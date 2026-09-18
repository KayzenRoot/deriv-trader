# V1 Connection Settings UX

## Settings navigation
Account
Security
Trading
Risk
Strategy Runners
Connections
Notifications

## Connections > Deriv card
States:
NOT_CONFIGURED
VALIDATING
CONNECTED_DEMO
CONNECTED_REAL_BUT_GATED
EXPIRED
REVOKED
ERROR

## PAT form
Fields:
- Deriv App ID
- Personal Access Token (password field)
- environment/account selection after validation

Actions:
- Save & Test
- Replace
- Disconnect

After save:
- token field clears;
- UI displays only masked metadata/status;
- validation result shows scopes/account/environment;
- no reveal-secret button.

## OAuth future
Button: Connect with Deriv
The user leaves Deriv Trader for Deriv consent, returns via secure callback, then selects account context.

## Safety banner
If a real Deriv account is connected while project go-live is not approved:
REAL ACCOUNT CONNECTED — LIVE ORDER EXECUTION DISABLED BY SYSTEM GATE.

Connection is not permission to trade live.
