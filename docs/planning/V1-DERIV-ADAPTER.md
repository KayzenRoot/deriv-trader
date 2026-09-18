# V1 Deriv Adapter

## Goal
Isolate every external Deriv API detail behind one typed adapter so strategies, risk and UI never depend on raw broker schemas.

## API direction
Prefer the current Deriv Options API surfaces for new V1 code. Use legacy compatibility only when a required capability is not yet available on the current API and that exception is explicitly documented/tested.

## Public market channel
Current Deriv docs expose a public WebSocket for read-only market data without authentication.

The adapter owns:
- public connection lifecycle;
- active_symbols;
- contracts_for;
- ticks/ticks_history;
- proposal where supported;
- subscription IDs;
- req_id correlation;
- schema normalization;
- reconnect/resubscribe.

## Authenticated trading channel
Current Options API flow:
1. user credential authenticates the REST request;
2. request an account-specific one-time WebSocket password/URL;
3. OTP is short-lived and single-use;
4. connect immediately to the returned demo/real WebSocket URL;
5. trading messages run over that authenticated account-scoped socket.

The current docs state the OTP is valid for 120 seconds and can be used once.

## Environment isolation
PUBLIC
DEMO_AUTHENTICATED
REAL_AUTHENTICATED

These are distinct adapter states/connections. REAL is additionally blocked by Deriv Trader governance.

## Typed domain interface
The rest of the product consumes normalized domain objects, for example:
- ActiveInstrument
- ContractCapability
- MarketTick
- ProposalEconomics
- BuyResult
- OpenContractState
- BrokerError
- ApiBudgetState

Raw Deriv payloads do not leak into strategy implementations.

## Compatibility boundary
Legacy/new API differences such as symbol -> underlying_symbol are handled inside parser/mapper modules with fixtures and contract tests.

## Safety
No strategy module gets direct socket/client access.
Only execution code can invoke economic adapter methods after Risk admission.
