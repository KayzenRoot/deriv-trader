# V1 User Flows

## Account onboarding
1. User creates/signs into Deriv Trader through Supabase Auth.
2. Opens Settings > Connections > Deriv.
3. Configures Deriv connection.
4. Local V1: enter PAT + Deriv App ID, then Save & Test.
5. App validates account/scopes and stores secret through SecretStore.
6. User selects the demo account/environment.
7. Connection card shows status but never reveals the saved token.

## Trading setup
1. Configure fixed stake/global risk.
2. Set max simultaneous orders.
3. Select Strategy Runners.
4. Start Selected or Start All.
5. Runners scan independently.
6. Risk/slot/broker gates arbitrate.
7. Orders open automatically only in admitted environment.

## Future OAuth SaaS flow
Signed-in user -> Settings -> Connect Deriv -> Deriv OAuth consent/PKCE -> secure backend callback/token exchange -> account selection -> connected.

## Real account safety
A real connection can be stored/tested, but UI must show LIVE EXECUTION DISABLED until the project go-live gate is explicitly approved.

## Daily operation
Overview -> connection health -> risk/slots -> active Runners -> Start All -> monitor -> Stop All/Kill Switch as needed.
