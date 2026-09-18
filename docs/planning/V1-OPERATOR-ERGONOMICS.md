# V1 Operator Ergonomics

## One-glance principle
Within a few seconds the user should answer:
- Is the robot running?
- Which Runners are active?
- Are we in Demo or Real-Gated?
- How many slots are used?
- What is today's PnL?
- How much daily risk remains?
- Is Deriv connected?
- Is any critical alert active?

## Safe defaults
- demo environment by default;
- Start All only starts explicitly selected/validated Runners;
- destructive/high-impact actions require clear confirmation;
- Kill Switch remains easy to reach but protected from accidental taps;
- real environment has unmistakable persistent labeling.

## Fast workflows
Common actions should be reachable within 1-2 navigation steps:
- Start/Stop All;
- strategy selection;
- risk settings;
- Deriv connection;
- open orders;
- report period filter;
- system health.

## Confirmation strategy
Do not confirm harmless navigation/filtering.
Require confirmation for:
- Kill Switch;
- disconnect active Deriv connection;
- lowering major safety constraints while Runners are active where relevant;
- deleting data;
- admin suspension/maintenance actions.

## Keyboard/desktop
V1 may support safe shortcuts for navigation and non-destructive controls.
No single-key shortcut should place economic orders.

## Mobile
Critical monitoring, Stop All and Kill Switch remain accessible, but configuration-heavy workflows can redirect to desktop-friendly layouts.
