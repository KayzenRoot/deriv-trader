# V1 Market Data Pipeline

Verified against current official Deriv API documentation on 2026-09-18.

## Goal
Feed every active Strategy Runner with one shared, normalized and freshness-aware market stream without duplicating subscriptions or wasting API budget.

## Official Deriv data surfaces used
- active_symbols: current active trading symbols, no auth;
- contracts_for: available contract types for a symbol, no auth;
- ticks: live tick subscription for one symbol, no auth;
- ticks_history: historical tick data for bootstrap/research;
- proposal: current contract economics/pricing, no auth for supported flows.

## Pipeline
Deriv public WebSocket
  -> Connection Supervisor
  -> Symbol Registry
  -> Contract Capability Registry
  -> Tick Subscription Manager
  -> Normalizer
  -> Freshness Monitor
  -> Feature Windows
  -> Payout Pulse Scheduler
  -> Eligible Opportunity Snapshot
  -> active Strategy Runners

## Shared-stream rule
If five Runners need EUR/USD ticks, Deriv Trader maintains one underlying market subscription and fans normalized events out internally. Runner count must not multiply broker subscriptions unnecessarily.

## Normalized tick
- underlying_symbol
- event_time
- receive_time
- quote
- pip_size when available
- source_connection_id
- source_msg_id/req_id when available
- sequence/local_event_id
- stale flag
- gap/anomaly metadata

## Freshness
Every data object carries event age and receive age. Trading decisions must fail closed when required data crosses the profile's validated freshness threshold.

## Schema compatibility
The adapter uses current new-API field names such as underlying_symbol. Legacy/current compatibility differences are isolated inside the Deriv adapter and covered by contract tests.

## No strategy logic
Market Data Pipeline never decides CALL/PUT. It provides normalized evidence only.
