# V1 Notifications & Alerts

## Goal
Notify the user about events that matter without turning the product into a siren.

## Priority levels
INFO
SUCCESS
WARNING
CRITICAL

## In-app notifications
Required in V1:
- Deriv connection lost/restored;
- worker offline/recovered;
- Runner started/stopped/error;
- daily loss limit reached;
- daily profit target reached;
- Loss Cascade Brake state change;
- API rate pressure;
- stale market/proposal state;
- order opened/settled/reconciliation required;
- report generated;
- disk/storage pressure;
- schema drift/compatibility issue;
- security/admin event affecting the user.

## Channels
V1 mandatory:
- in-app notification center;
- toast/banner for time-sensitive events;
- persistent critical banner for hard-stop/security conditions.

Optional free-first channels to evaluate later:
- browser push;
- email through a free allowance provider;
- Telegram bot notifications.

No external notification provider is made mandatory for V1.

## Noise control
- deduplicate repeated alerts;
- cooldown noisy repeated warnings;
- aggregate similar scanner/API alerts;
- CRITICAL alerts remain persistent until acknowledged/resolved;
- user can configure non-critical categories.

## Audit
Trading/risk/security notifications reference the underlying canonical event id.
