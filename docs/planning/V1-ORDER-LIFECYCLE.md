# V1 Order Lifecycle

## States
SIGNAL_CREATED
-> RISK_PENDING
-> RISK_ADMITTED
-> PROPOSAL_REFRESH
-> READY_TO_BUY
-> BUY_SUBMITTED
-> OPEN
-> SETTLED

Terminal/error states:
SKIPPED
BLOCKED
REJECTED
CANCELLED
UNKNOWN_RECONCILIATION_REQUIRED
ERROR

## Rules
- A signal alone never becomes an order.
- RISK_ADMITTED reserves the necessary global order slot/exposure budget for a bounded period.
- Proposal economics must be fresh before purchase.
- If proposal changes below payout threshold or edge gate, release reservation and SKIP.
- BUY_SUBMITTED must be idempotent/replay-safe.
- OPEN state must be reconciled against broker truth.
- SETTLED closes accounting, risk exposure and audit records.
- UNKNOWN_RECONCILIATION_REQUIRED is fail-closed for new duplicate purchases until broker state is resolved.

## No blind retries
A failed/ambiguous buy response is never blindly retried. Query/reconcile broker state first.

## Slot release
Reservations/slots are released on SKIPPED/BLOCKED/REJECTED or after settlement/error resolution according to deterministic rules.
