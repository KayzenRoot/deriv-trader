# Deriv Trader

Governed quantitative research and automated trading project (V1 foundation).
Canonical project truth lives under `docs/source-pack/` and `.engineering/`.

> DT-WP-01 foundation: LOCAL-FIRST / FREE-FIRST / DEMO-FIRST. No live trading,
> no broker order execution, no real credentials in this module.

## Requirements

- Node.js 24 LTS (`node --version` should report v24.x)
- npm 11.x (`npm --version` should report 11.x)
- Windows, macOS, or Linux. The repo enforces LF line endings via
  `.gitattributes`; let Git normalize on checkout.

## Setup (Windows-friendly, PowerShell)

```powershell
node --version
npm --version
npm ci
```

Copy the environment template for local runs (never commit real secrets):

```powershell
Copy-Item .env.example .env
```

## One-command validation

```powershell
npm run validate
```

`validate` runs: EOL check, package-boundary check, cycle check, lint,
typecheck (builds packages + trader), tests, and build.

Other useful commands:

```powershell
npm run check:eol
npm run check:deps
npm run check:cycles
npm run lint
npm run typecheck
npm test
npm run build
npm run audit:high
```

## Run the apps

Trader Worker (loopback-only, default `127.0.0.1:3101`):

```powershell
npm --workspace @deriv-trader/trader run build
npm --workspace @deriv-trader/trader run start
# health:
#   Invoke-RestMethod http://127.0.0.1:3101/v1/health
#   Invoke-RestMethod http://127.0.0.1:3101/v1/status
```

Web foundation shell (Next.js, default `http://localhost:3000`):

```powershell
npm --workspace @deriv-trader/web run dev
# production build:
npm --workspace @deriv-trader/web run build
```

Run both together (two terminals, or one PowerShell with two jobs):

```powershell
Start-Job { npm --workspace @deriv-trader/trader run start }
npm --workspace @deriv-trader/web run dev
```

The web status screen reports `DEMO / FOUNDATION` and shows Trader Worker
health when the worker is reachable. No trading statistics are fabricated.

## Structure

- `apps/trader` — local Fastify worker, loopback-only, `/v1/health` + `/v1/status`.
- `apps/web` — Next.js App Router foundation shell (Tailwind tokens, ECharts/Motion smoke).
- `packages/domain` — typed vocabulary (expiries 60/180/300, signals, events).
- `packages/config`, `packages/events`, `packages/testing` — shared foundations.
- `packages/auth`, `packages/db`, `packages/connections`, `packages/secret-store` — skeleton boundaries.
- Remaining `packages/*` — compile-safe boundaries for later work packages.
- `data/` — local runtime root (git-ignored artifacts; see `data/README.md`).
- `.engineering/evidence/DT-DEV-BOOTSTRAP-0001.md` — executor evidence for this work package.
