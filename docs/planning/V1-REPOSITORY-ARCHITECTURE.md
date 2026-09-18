# V1 Repository Architecture

## Monorepo
apps/
  web/
  trader/

packages/
  domain/
  auth/
  connections/
  secret-store/
  deriv-adapter/
  market-data/
  scanner/
  strategies/
  risk/
  execution/
  events/
  db/
  research/
  reporting/
  ui/
  config/
  testing/

data/
  .gitkeep

docs/
  planning/
  discovery/
  source-pack/

.engineering/
  work-orders/
  context-locks/
  evidence/
  integrations/
  templates/

## Dependency direction
ui -> domain contracts only
web -> auth/domain/API clients
trader -> domain + service packages
strategies -> domain/market features, never web/db implementation
risk -> domain, no strategy implementation dependency
execution -> domain/risk/deriv adapter
db -> persistence adapters
research -> domain/strategy interfaces, not production side effects

## Forbidden coupling
- strategy packages cannot call Deriv buy directly;
- UI cannot call broker buy directly;
- risk cannot depend on UI state;
- browser cannot access SecretStore;
- research replay cannot emit economic orders;
- admin routes cannot bypass ownership/risk rules.

## Shared types
Cross-boundary DTOs/events live in a small domain/contracts layer to avoid circular dependencies.
