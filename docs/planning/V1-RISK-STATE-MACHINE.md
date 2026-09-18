# V1 Risk State Machine

## Global states
READY
CAUTION
THROTTLED
DAILY_STOPPED
TARGET_STOPPED
PAUSED
KILLED
ERROR

## Semantics
READY: normal admission.
CAUTION: warning state, no mandatory block unless a configured rule requires it.
THROTTLED: reduced new-order admission according to policy.
DAILY_STOPPED: no new orders until the next configured reset boundary.
TARGET_STOPPED: no new orders after configured profit target if target-stop is enabled.
PAUSED: user/system pause, no new entries.
KILLED: emergency no-new-entry state requiring explicit recovery.
ERROR: fail-closed when risk state cannot be trusted.

## Reset boundary
Daily counters must use an explicit user/account timezone policy. Never infer midnight from server-local time.

## Atomicity
State changes that block admissions must become effective atomically relative to new order admission.
