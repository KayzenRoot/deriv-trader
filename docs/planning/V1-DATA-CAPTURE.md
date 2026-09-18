# V1 Data Capture

## Tick capture
Capture normalized tick events with:
- instrument;
- event timestamp;
- receive timestamp;
- quote;
- pip/precision metadata when available;
- source connection;
- local sequence/event id;
- gap/stale flags;
- parser/schema version;
- collector build Git SHA.

## Proposal capture
Capture prospectively:
- instrument;
- contract type;
- expiry/duration;
- ask_price;
- payout;
- effective payout ratio;
- break-even probability;
- proposal id/reference;
- requested/received timestamps;
- freshness metadata;
- source account/environment where relevant;
- parser/schema version;
- collector build Git SHA.

## Execution capture
Capture:
- Runner identity/version;
- signal;
- proposal;
- risk decision;
- order lifecycle;
- settlement;
- PnL;
- reconciliation status.

## Raw payload policy
Retain raw payloads selectively for contract-test/schema-drift evidence and debugging, not indefinitely by default.

## Backpressure
If local disk or writer throughput becomes constrained:
1. preserve order/audit correctness first;
2. preserve proposal/economic evidence second;
3. degrade optional research capture explicitly;
4. never block Risk/Execution correctness to save optional raw data.
