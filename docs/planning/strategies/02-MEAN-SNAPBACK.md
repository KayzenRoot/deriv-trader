# Strategy 02 — Mean Snapback

Category: short-horizon mean reversion.
Independent engine: yes.

## Intent
Capture reversal toward a local adaptive mean after a statistically unusual extension, but only when the market behaves as range/mean-reverting rather than trending.

## Candidate feature families
- robust z-score of price versus adaptive mean/median;
- normalized range/Bollinger-style distance;
- RSI-like bounded momentum as a descriptive feature, not sole trigger;
- trend-strength/range-regime measure;
- extension velocity followed by deceleration;
- reversal micro-pattern/tick persistence;
- realized volatility band.

## Entry concept
PUT candidate after validated upside extension when range regime remains intact and extension decelerates/reverses.
CALL is symmetric after downside extension.

## NO_SIGNAL
Strong trend; breakout regime; mean itself moving aggressively; fresh volatility shock; no reversal evidence; stale/sparse history.

## 1m / 3m / 5m
Independent extension and reversal thresholds. Do not assume 1m mean reversion generalizes to 5m.

## UI summary
"Procura movimentos curtos excessivamente esticados e tenta capturar o retorno do preço à média quando o mercado continua lateral."
