# V1 Module Dependency Audit

## Allowed dependency direction
domain/contracts
  <- auth/connections
  <- market-data/scanner
  <- strategies
  <- risk
  <- execution
  <- events/persistence
  <- trader orchestration
  <- web/API presentation

Research consumes domain/strategy contracts but has no economic side effects.

## Hard boundaries
- strategies cannot import execution/broker buy clients;
- risk cannot import UI;
- execution cannot bypass risk;
- UI cannot import SecretStore;
- admin cannot call broker economic methods directly;
- research cannot emit buy/sell;
- Deriv adapter cannot know product UI state;
- Supabase persistence cannot become the only source of truth for unresolved broker orders.

## Shared concerns
Cross-cutting packages allowed:
- config;
- logging;
- telemetry;
- schema/contracts;
- test fixtures.

## Circular dependency rule
No circular package dependencies.
CI fails on cycle detection.

## V1 modular monolith
All packages may run in one process, but boundaries are enforced at code/package level to preserve future split points.

## Split points later
Only after evidence:
- hosted worker fleet;
- research jobs;
- reporting;
- notification service.

No microservice split in V1.
