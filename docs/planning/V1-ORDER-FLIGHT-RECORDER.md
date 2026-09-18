# V1 Order Flight Recorder

Internal technology name: Order Flight Recorder (OFR)

## Purpose
Create one immutable-style evidence trail for every attempted order so any result can be reconstructed.

## Captured chain
- runner_id / strategy version / expiry;
- signal timestamp and feature snapshot hash;
- proposal id/economics/freshness;
- risk state and slot reservation;
- payout threshold / edge decision;
- buy request correlation/idempotency key;
- broker response metadata;
- open-contract lifecycle events;
- settlement result;
- net PnL;
- reconciliation status;
- relevant configuration version;
- Git/build version.

## Uses
- dashboard drill-down;
- reports;
- deterministic replay;
- debugging;
- strategy validation;
- dispute/audit support;
- incident analysis.

## Privacy/security
No secret values, auth tokens or sensitive credential material are stored in OFR records.
