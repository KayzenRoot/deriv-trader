# Initial Strategy Pack V1

These are candidate strategy families. They are NOT labeled profitable until Deriv-specific OOS/demo evidence exists.

## 1. Momentum / Trend Continuation
Summary: follows short directional movement and looks for continuation while momentum remains valid.
Entry family: directional impulse + trend/momentum filters + regime suitability.
Best suited conceptually to: directional expansion.
Expiry candidates: 1m/3m/5m subject to independent validation.

## 2. Mean Reversion
Summary: looks for statistically stretched short-term moves and attempts to capture a return toward a local mean.
Entry family: extension/extreme + range/regime filter + reversal confirmation.
Best suited conceptually to: range/overextension.
Expiry candidates: 1m/3m/5m subject to independent validation.

## 3. Breakout / Volatility Expansion
Summary: looks for price escaping a defined compression/range with sufficient expansion to justify continuation.
Entry family: range break + volatility expansion + false-break filters.
Best suited conceptually to: transition from compression to expansion.
Expiry candidates: 1m/3m/5m subject to independent validation.

## 4. Mean-Price / VWAP-Style Context
Summary: evaluates price relative to an intraday/local reference mean and trades either continuation away from or reversion toward that mean according to the validated variant.
Entry family: distance/slope/context around a reference price.
Important limitation: true VWAP requires suitable volume/trade data. If unavailable, the V1 must use a clearly named validated proxy rather than falsely calling it VWAP.
Expiry candidates: 1m/3m/5m subject to independent validation.

## 5. Microstructure / Order-Flow Proxy
Summary: uses the best genuinely available short-horizon microstructure information to confirm directional pressure.
Entry family: tick pace, quote/price dynamics and other available microstructure features.
Important limitation: it must not be marketed as full order flow unless genuine bid/ask/order-book/trade data supports that claim.
Expiry candidates: 1m/3m/5m subject to independent validation.

## Common execution rule
Only the selected strategy runs for the user's execution profile. The other four do not confirm, veto, average or blend its signal.
