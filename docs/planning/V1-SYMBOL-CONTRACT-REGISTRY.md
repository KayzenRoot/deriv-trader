# V1 Symbol & Contract Registry

## Purpose
Maintain the live universe of instruments that are actually usable by the product.

## Discovery
1. request active_symbols;
2. normalize each underlying symbol;
3. fetch/cache contracts_for where required;
4. determine whether the strategy product's contract family and requested expiries are currently supported;
5. mark instrument ACTIVE_ELIGIBLE, ACTIVE_UNSUPPORTED, CLOSED/INACTIVE, STALE or ERROR.

## Current Deriv facts
active_symbols returns currently active underlying markets.
contracts_for returns the available contracts for a specific underlying symbol.
Both are public/no-auth market-data endpoints in current documentation.

## Registry record
- underlying_symbol
- display/name metadata available from current schema
- symbol type/category
- pip_size
- active state
- supported contract families
- supported duration units/ranges as derivable from current contract metadata
- last contracts refresh
- last tick time
- eligibility state/reason
- schema/source version

## Refresh policy
Symbol/capability refresh is event/time driven and conservative. Do not refetch contracts_for on every tick.

Refresh triggers may include:
- startup;
- periodic TTL;
- Deriv reconnect;
- symbol-set change;
- contract rejection indicating stale capability data.

## User universe
V1 default scans all supported/eligible instruments exposed by the connected Deriv environment. User allowlist/blocklist can narrow the universe, never widen beyond broker capability.
