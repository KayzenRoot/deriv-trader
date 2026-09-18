# V1 UX State System

## Universal states
LOADING
READY
EMPTY
STALE
DEGRADED
ERROR
OFFLINE
BLOCKED
PERMISSION_DENIED

Every data-heavy component must intentionally design these states.

## Trading-critical states
DEMO
REAL_CONNECTED_BUT_GATED
RUNNING
PAUSED
STOPPED
DAILY_STOPPED
THROTTLED
KILLED
RECONCILING

## Visual semantics
Semantic status colors/tokens are defined by UGAS design system but must maintain accessible contrast.

Critical examples:
- green family: healthy/positive state, not "guaranteed profit";
- amber family: caution/stale/throttled;
- red family: error/hard stop/kill/loss;
- neutral/blue family: informational/demo/system activity.

## Stale-data rule
Never display stale payout/market data as if current.
Show:
- stale badge;
- age;
- last known value;
- affected actions disabled when required.

## Empty states
Empty states explain why data is absent and what action is available, rather than decorative blank cards.
