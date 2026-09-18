# Deriv Trader Discovery 0001
Date: 2026-09-18
Status: EVIDENCE-BOUND DISCOVERY

## Proven current API surface
Official Deriv documentation exposes REST account/setup services plus WebSocket market-data and trading services. Public WebSocket market data does not require authentication. Demo and real Options WebSockets are separate and use an OTP obtained through authenticated REST. The official surface includes active symbols, tick streaming, tick history, price proposals, buy, sell and open-contract monitoring.

## Engineering consequences
1. Build one broker adapter with explicit PUBLIC / DEMO / REAL environment types. REAL must be compile/runtime gated.
2. Market-data research can begin without live trading credentials where the public API supplies the required data.
3. Proposal snapshots must be stored with timestamp, underlying, contract parameters, ask/payout economics and model decision so expected value is calculated from offered economics rather than assumed payout.
4. Historical tick availability is useful but does not by itself prove historical proposal/payout reconstruction. Until proven, backtests that require exact historical payout must label payout as modeled/unknown.
5. API migration risk exists: official comparison documentation records breaking field-name/schema changes. Contract tests and schema-version evidence are mandatory.

## Regulatory constraint
The Brazilian CVM published an alert stating Deriv.com/Binary.com was not authorized by the CVM to act as a securities intermediary or solicit residents in Brazil and ordered suspension of public offers of those intermediation services to Brazilian residents. This project therefore keeps REAL trading BLOCKED pending a later, current legal/regulatory suitability review. This discovery does not make a legal conclusion about an individual's use.

## Research thesis
The project is not trying to maximize raw win rate. Candidate edge must exceed payout-implied break-even with a safety margin and survive strict out-of-sample/walk-forward testing.

For stake S and net profit payout ratio r, break-even win probability is p*=1/(1+r). Expected value per unit stake is EV=p*r-(1-p). These formulas are acceptance primitives, not evidence that an edge exists.

## Unknowns that must be measured
- Active contract types and duration limits per eligible underlying/account/jurisdiction.
- Proposal economics/payout distribution by symbol, duration, contract type and time.
- Public historical depth/rate limits and reconnect behavior.
- Whether exact historical proposal economics can be reconstructed or must be prospectively captured.
- Latency, quote lifetime, proposal-to-buy slippage/rejection behavior in demo.
- API limits and error taxonomy.
- Availability/eligibility from the user's actual account/jurisdiction.
- Local Hive V1 health and GEF source-workspace validation.

## Go/no-go research gates
G0 API/data feasibility; G1 prospective payout dataset; G2 reproducible baseline backtester; G3 leakage-safe candidate research; G4 walk-forward/OOS robustness; G5 demo execution/reconciliation; G6 extended shadow/demo stability. No REAL gate is admitted in this discovery.

## Next bounded increments
DT-HIVE-0001 local synchronization/preflight.
DT-API-0001 read-only public Deriv adapter + contract tests.
DT-DATA-0001 provenance-first tick/proposal capture specification.
DT-ARCH-0001 freeze runtime/data architecture after those measurements.
