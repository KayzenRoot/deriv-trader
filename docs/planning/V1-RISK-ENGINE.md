# V1 Global Risk Engine

## Purpose
Protect the user's configured capital/risk budget across every active Strategy Runner.

## Gate order
Every signal must pass:
1. system/environment state;
2. daily hard-stop state;
3. kill/pause state;
4. stale-data/proposal checks;
5. fixed stake and max-stake checks;
6. max simultaneous orders;
7. max per-instrument orders;
8. max open exposure;
9. cooldown and operating-window rules;
10. consecutive-loss controls;
11. Loss Cascade Brake;
12. broker/API eligibility;
13. idempotent execution admission.

Any failure returns an explicit block reason.

## User-configurable controls
- fixed stake per order;
- max stake;
- max simultaneous orders;
- max orders per instrument;
- daily max loss;
- optional daily profit target;
- max consecutive losses;
- cooldown;
- allowed operating windows;
- allowlist/blocklist;
- pause new entries;
- Stop All;
- emergency kill switch.

## Hard invariants
- no Runner can bypass risk;
- open orders never exceed the configured global cap;
- aggregate open stake never exceeds max_open_exposure;
- daily stop blocks all new admissions atomically;
- stale or unconfirmed proposal economics never execute;
- no stale signal is queued for later blind execution;
- every block is audited with reason code.
