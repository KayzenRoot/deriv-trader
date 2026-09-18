# V1 Operator Journeys

## Journey A — first use
Sign up/login -> connect Deriv -> connection test -> set risk -> select Runners -> Start -> Dashboard.

## Journey B — normal trading session
Login -> verify DEMO/environment -> inspect risk budget -> inspect connection/worker -> Start All -> monitor -> Stop All/end session.

## Journey C — investigate a loss
Dashboard loss/order -> Order detail -> Runner/strategy/expiry -> proposal economics -> risk admission -> market snapshot -> settlement -> optional replay/evidence.

## Journey D — adjust risk
Risk Center -> edit limit -> validate -> save -> worker confirms config version -> dashboard reflects new state.

## Journey E — connection failure
Global alert -> Connection Settings -> error reason -> reconnect/test -> worker confirms -> Runner states resume only according to safe restart policy.

## Journey F — report
Analytics/Reports -> select 7d/15d/30d/custom -> filters -> preview -> export PDF/CSV.

## Journey G — emergency
From any trading page -> Stop All or Kill Switch -> authoritative confirmation -> all new admissions blocked -> existing orders remain tracked/reconciled.
