# V1 Proposal Economics & Edge Gate

The Edge Gate belongs to the selected strategy execution path; it is not confluence among strategies.

## Normalize actual proposal economics
Let A = ask_price and P = payout from the current valid proposal.
Effective net payout ratio: r = (P - A) / A.
Effective net payout percent: 100*r.
Break-even win probability: p_be = A / P = 1/(1+r).

Example only: when effective net payout is 80%, break-even is about 55.56%.

The product's default minimum payout rule of 80% means effective net payout >=80% using proposal economics, not merely a UI label.

## Strategy edge
When a strategy has a calibrated conditional probability estimate p_hat:
edge_probability = p_hat - p_be.
Expected net value per unit stake = p_hat*r - (1-p_hat).

A signal may proceed only when its own validated Edge Gate criteria are satisfied. Required safety margin is learned/frozen by DT-STRAT-0001 and must not be invented during implementation.

## Calibration
Probability calibration is performed independently by strategy and expiry profile using leakage-safe OOS/walk-forward evidence. Sparse symbol/regime buckets require conservative fallback or NO_SIGNAL.

## Freshness
Stale proposal economics invalidate the Edge Gate. If proposal economics change materially before purchase, re-evaluate or skip.
