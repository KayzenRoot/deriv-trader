# V1 Per-User Deriv Connections

## Product requirement
Every logged-in Deriv Trader user configures their own Deriv API connection from Settings. No global shared user token.

## Settings > Connections > Deriv
Show:
- connection status;
- auth method;
- Deriv App ID when applicable;
- environment: Demo / Real;
- connected account identifier(s), masked where appropriate;
- token/scopes status without revealing secret;
- last validation/error;
- Reconnect / Replace / Disconnect / Test Connection.

## V1 local auth: PAT
PAT + Deriv App ID is the preferred local-first setup.

Flow:
1. user signs into Deriv Trader;
2. enters PAT + App ID;
3. worker validates permitted account/scopes;
4. secret is persisted only through SecretStore;
5. UI clears the token field and never renders it again;
6. for authenticated Options WebSocket use, worker obtains the current account-specific OTP/URL and opens it immediately.

Current Options docs state OTP is single-use and valid for 120 seconds.

## Public vs authenticated sockets
Read-only public market data uses the public WebSocket without broker auth.
Demo trading uses account-scoped authenticated demo WebSocket.
Real uses account-scoped authenticated real WebSocket but remains blocked by the Deriv Trader live gate.

## Future hosted OAuth
Hosted SaaS should prefer OAuth 2.0 Authorization Code + PKCE.

Current official pages document PKCE/state/server-side token exchange. Deriv workflow documentation also references refresh-token handling. Because token lifecycle documentation can evolve, DT-AUTH implementation must re-verify the OAuth reference/workflow immediately before coding renewal behavior rather than freezing a stale assumption here.

## Least privilege
Request only minimum scopes. Do not request payment/account-management scopes unless a separately approved feature requires them.

## Multi-account
V1 may discover multiple accounts, but one active trading account context is selected per execution profile unless later expanded.

## Real-money gate
Valid credentials never unlock real execution by themselves.
