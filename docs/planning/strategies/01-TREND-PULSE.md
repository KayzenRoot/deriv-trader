# Strategy 01 — Trend Pulse

Category: momentum / trend continuation.
Independent engine: yes.

## Intent
Capture short continuation when recent price movement is directional, persistent and not already exhausted.

## Candidate feature families
- multi-window log/percentage returns;
- robust slope of price/EMA/regression anchor;
- directional persistence ratio;
- realized volatility and volatility percentile;
- distance from local range/anchor;
- acceleration/deceleration;
- tick-density/gap anomaly flags.

## Entry concept
CALL candidate when fast and medium directional returns align upward, slope is positive, persistence is sufficient, volatility is inside the validated operating band, and exhaustion/anomaly filters are clear.
PUT is symmetric.

## NO_SIGNAL
Choppy alternation; conflicting directional windows; volatility too low/high; extreme one-tick jump; late/exhausted extension; stale data; insufficient history.

## 1m / 3m / 5m
Three independent profiles. 1m emphasizes faster persistence and strict anomaly protection; 3m uses broader confirmation; 5m uses slower trend state and can reject short micro-bursts. Exact windows/thresholds are learned only from research evidence.

## UI summary
"Segue movimentos direcionais curtos e tenta entrar a favor da tendência enquanto impulso e persistência continuam saudáveis."
