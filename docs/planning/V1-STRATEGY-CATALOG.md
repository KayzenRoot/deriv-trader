# Initial Strategy Pack V1

These are five independent candidate engines. Exactly one is active per user/profile. None is labeled profitable until Deriv-specific OOS/demo evidence exists.

## 1. Trend Pulse — Momentum / Trend Continuation
UI summary: follows a short directional move and enters only while momentum, persistence and volatility still support continuation.
Core behavior: directional impulse + persistence + trend slope + non-exhaustion filters.
Primary failure mode: chop, late entries and one-tick spikes.

## 2. Mean Snapback — Short-Horizon Mean Reversion
UI summary: waits for a statistically stretched move in a range-like market and looks for a controlled return toward the local mean.
Core behavior: normalized extension + range regime + deceleration/reversal confirmation.
Primary failure mode: fighting a genuine breakout or strong trend.

## 3. Breakout Surge — Compression to Expansion
UI summary: detects a compressed price range and enters when price escapes it with credible volatility expansion and persistence.
Core behavior: compression + boundary break + expansion + false-break protection.
Primary failure mode: fake breakouts and entries after the move is already exhausted.

## 4. Anchor Pullback — Trend Pullback to Adaptive Mean
UI summary: identifies an existing directional trend, waits for price to pull back toward an adaptive reference price, then enters when the trend resumes.
Core behavior: directional anchor slope + controlled pullback + rejection/reacceleration.
Primary failure mode: flat anchors, trend reversal or excessive pullback.
Data naming rule: use true VWAP only if reliable volume exists; otherwise call the reference an Adaptive Price Anchor.

## 5. Micro Pressure — Tick/Microstructure Pressure
UI summary: measures short-horizon directional pressure from genuine available tick/microstructure data and enters only when one-sided pressure is persistent enough.
Core behavior: tick imbalance + arrival-rate/velocity + directional persistence + anomaly filters.
Primary failure mode: sparse/noisy ticks and confusing proxy pressure with genuine exchange order flow.
Naming rule: do not market this as full Order Flow unless genuine signed trade/order-book data is available.

## Common
Candidate expiries: 1m, 3m, 5m, each independently calibrated. A strategy or expiry profile may be disabled if validation fails.
