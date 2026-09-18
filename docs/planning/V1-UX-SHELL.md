# V1 Application Shell

## Desktop layout
### Left sidebar
Persistent icon + label navigation.
Collapsible to compact icon mode.

### Top bar
Always-visible critical status:
- DEMO / REAL GATED badge;
- Deriv connection indicator;
- local worker status;
- active Runner count;
- slot usage X/Y;
- daily PnL;
- risk state;
- notifications;
- user menu.

### Global emergency controls
Stop All and Kill Switch must remain reachable in one interaction from any trading screen.

## Main canvas
Responsive content grid with consistent glass panels and data-density rules.

## Context header
Each screen includes:
- title;
- short context;
- key actions;
- optional global date filter;
- optional environment/profile selector.

## Command feedback
Every Start/Stop/Save/Kill action has:
- immediate optimistic intent state only where safe;
- authoritative worker confirmation;
- timeout/error state;
- audit correlation where relevant.

UI must never claim RUNNING merely because the button was clicked. Worker state is authoritative.
