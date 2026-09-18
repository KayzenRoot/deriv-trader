# Definition of Done — Deriv Trader V1

V1 is complete only when the approved demo/paper scope is implemented, tested, documented and objectively validated on an exact Git head.

## Product
- UGAS-produced Deriv Trader identity/design system integrated;
- complete Dashboard, Scanner, Strategy Control Center, Orders, Analytics, Risk, Reports, Settings, Admin and System Health surfaces;
- multiple independently selectable/active Strategy Runners supported;
- each Runner = one strategy family + one validated expiry profile;
- Start/Stop individual, Start All, Stop All and Kill Switch work authoritatively;
- dashboard/reporting expose PnL, invested amount, orders, wins/losses, win rate, payout, drawdown, Runner/expiry/instrument breakdowns and date filters;
- PDF summary + CSV detail reporting.

## Identity / Security
- Supabase Auth;
- USER/ADMIN;
- RLS/user isolation;
- per-user Deriv connection;
- SecretStore;
- no plaintext broker tokens in normal DB/logs/browser after save;
- audited high-risk admin actions;
- local worker bound securely to user;
- localhost-first worker surface.

## Deriv / Scanner
- current API contract tests;
- public/auth transport separation;
- current schema normalization;
- API Budget Manager;
- Schema Drift Guard;
- Symbol/Contract Registry;
- shared tick streams;
- Market Freshness Matrix;
- Payout Pulse Scheduler;
- effective payout gate;
- reconnect/backoff/cleanup evidence.

## Data / Research
- local Parquet + DuckDB;
- tick/proposal capture;
- Dataset Passport;
- Data Quality Gate;
- deterministic replay;
- chronological leakage-safe research partitions;
- historical tick evidence never misrepresented as exact historical payout evidence.

## Strategies
- five strategy families implemented as independent engines;
- strategy/expiry profiles validated independently;
- 1m/3m/5m enabled only where research/API evidence supports them;
- failed profiles disabled rather than curve-fit;
- NO_SIGNAL first-class;
- no mandatory cross-strategy confluence;
- no profitability claim without Deriv-specific OOS/prospective/demo evidence.

## Risk / Execution
- global simultaneous-order cap;
- exposure/per-instrument/daily loss/target/streak/cooldown controls;
- Loss Cascade Brake;
- atomic order-slot/risk admission;
- idempotent demo execution;
- ambiguous actions reconciled before retry;
- restart/recovery proven;
- Order Flight Recorder;
- zero untracked economic actions in test evidence.

## Engineering / Operations
- frozen stack/lockfile;
- typecheck/lint/unit/integration/contract/concurrency/E2E suites green as applicable;
- no unresolved CRITICAL/HIGH defects;
- security/dependency audit green at threshold;
- docs match code;
- alerts/health/storage/API pressure observable;
- exact-head evidence + checkpoint promotion.

## Live
Live-money execution is EXCLUDED from V1 Definition of Done.
A separate HIGH_ASSURANCE go-live gate is mandatory.
