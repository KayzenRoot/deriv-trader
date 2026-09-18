# V1 Market Freshness Matrix

Internal technology name: Market Freshness Matrix (MFM)

## Goal
Represent whether every data dependency required by a decision is fresh enough at the exact moment of execution.

## Dimensions
Per symbol/contract/expiry:
- active-symbol registry age;
- contract-capability age;
- last tick event age;
- feature-window continuity;
- proposal age;
- connection health;
- clock-skew estimate;
- dataset gap state.

## Status
FRESH
AGING
STALE
GAPPED
UNTRUSTED

## Decision rule
A Runner can only issue an executable signal when every mandatory dependency is FRESH or within its independently validated tolerance.

If proposal goes stale after signal generation, final execution refresh must re-check payout/edge before buy.

## Why
A single boolean "connected" is insufficient. A socket can be connected while one instrument's ticks or proposal economics are stale.

## Telemetry
Dashboard/System Health exposes:
- stale instruments count;
- oldest active tick age;
- proposal freshness percentiles;
- reconnect count;
- dropped/gapped stream count.
