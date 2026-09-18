# Strategy 03 — Breakout Surge

Category: breakout / volatility expansion.
Independent engine: yes.

## Intent
Capture continuation immediately after a genuine transition from compression/range to directional expansion.

## Candidate feature families
- rolling high/low/range boundaries;
- compression percentile;
- realized-volatility expansion ratio;
- breakout distance normalized by recent range;
- directional persistence after boundary crossing;
- retest/hold behavior when horizon allows;
- one-tick spike and gap filters.

## Entry concept
CALL when price breaks the upper validated boundary from a compressed state and expansion/persistence criteria confirm the move is active but not exhausted.
PUT is symmetric.

## NO_SIGNAL
No prior compression; weak close/hold beyond boundary; immediate snapback; giant anomalous spike; breakout too mature; stale proposal.

## 1m / 3m / 5m
1m may use immediate persistence; 3m/5m can demand broader hold/retest evidence. All independently validated.

## UI summary
"Busca rompimentos de faixas comprimidas e entra quando o preço inicia uma expansão direcional com força suficiente para sustentar o movimento."
