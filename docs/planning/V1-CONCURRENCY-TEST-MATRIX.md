# V1 Concurrency & Order-Slot Test Matrix

## Purpose
Prove that multiple active Strategy Runners cannot violate global risk or order limits.

## Mandatory scenarios
1. Five Runners emit valid signals at the same instant with max_simultaneous_orders=5 -> exactly five or fewer orders admitted.
2. Six or more concurrent signals with cap=5 -> never more than five orders; excess signals recorded as SLOT_CAP_REACHED or otherwise blocked.
3. A slot frees after a signal was blocked -> old blocked signal is not executed blindly; a fresh evaluation is required.
4. Two Runners signal the same instrument simultaneously with max_orders_per_instrument=1 -> only one admitted.
5. Two Runners signal same instrument with per-instrument cap allowing two -> both may be admitted only if global risk and slot gates pass independently.
6. Daily loss stop trips while several Runners are RUNNING -> all new order admission stops atomically.
7. STOP ALL while signals are racing -> no new post-stop admissions; existing orders remain reconciled.
8. Kill switch while order requests are in flight -> no duplicate/untracked purchase; resulting broker state reconciled.
9. API rejection/rate limit after slot reservation -> slot is released safely and event audited.
10. Runner crash/restart -> open contracts remain tracked and no duplicate purchase is replayed.
11. Strategy Runner toggled off while evaluating -> pending evaluation cannot purchase after stop boundary unless already admitted under a clearly defined atomic state transition.
12. Duplicate start request for same strategy+expiry -> idempotent, one Runner instance only.

## Invariants
- open_order_count <= configured global cap at all times;
- per-instrument exposure <= configured cap;
- every admitted order has exactly one runner_id;
- every signal/order decision has deterministic reason code;
- no stale delayed execution;
- slot reservation/purchase/reconciliation are observable and recoverable.
