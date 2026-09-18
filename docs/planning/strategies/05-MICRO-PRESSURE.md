# Strategy 05 — Micro Pressure

Category: tick/microstructure pressure proxy.
Independent engine: yes.

## Intent
Exploit genuinely available short-horizon directional pressure without pretending that ordinary ticks are a full exchange order book.

## Candidate feature families
- signed tick-direction imbalance;
- up/down tick run statistics;
- tick arrival rate and acceleration;
- price change per tick;
- short-window directional efficiency;
- micro-burst persistence;
- gaps/staleness/outlier flags.
If true bid/ask, signed trades or order-book data later becomes available, they require a separately versioned feature set.

## Entry concept
CALL when validated one-sided upward tick pressure is persistent, data density is sufficient and anomaly/exhaustion filters are clear.
PUT is symmetric.

## NO_SIGNAL
Sparse ticks; alternating noise; anomalous burst; data gaps; pressure without price response; unvalidated data source.

## 1m / 3m / 5m
Pressure windows and persistence requirements are separately calibrated. Evidence from true FX order flow is only a research prior, not proof that Deriv tick proxies carry the same edge.

## UI summary
"Mede a pressão direcional de curtíssimo prazo nos ticks disponíveis e entra apenas quando o fluxo de movimento permanece claramente desequilibrado."
