# Strategy 04 — Anchor Pullback

Category: trend pullback / adaptive mean continuation.
Independent engine: yes.

## Intent
Join an established directional move at a better location after a controlled pullback toward an adaptive reference price.

## Anchor policy
If reliable volume/trade data exists, research may test true VWAP. Without reliable volume, the strategy must use an explicitly named Adaptive Price Anchor such as robust EMA/TWAP-like reference. Never mislabel a proxy as VWAP.

## Candidate feature families
- anchor slope/direction;
- distance to anchor normalized by volatility;
- trend persistence before pullback;
- pullback depth and duration;
- rejection/reacceleration away from anchor;
- cross/flip failure detection.

## Entry concept
CALL in an upward trend after price returns toward the rising anchor within a validated depth band and then reaccelerates upward.
PUT is symmetric.

## NO_SIGNAL
Flat anchor; excessive/deep pullback; repeated anchor crossings; trend-state loss; volatility shock; no reacceleration.

## 1m / 3m / 5m
Each expiry uses its own anchor speed, pullback depth and resume criteria.

## UI summary
"Espera uma tendência existente recuar até um preço de referência adaptativo e entra quando o movimento principal mostra retomada."
