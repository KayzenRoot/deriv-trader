# V1 Per-User Deriv Connections

## Product requirement
Every logged-in Deriv Trader user configures their own Deriv API connection from Settings.

No global shared user token is allowed.

## Settings UX
Settings > Connections > Deriv

Show:
- Connection status
- Auth method
- Deriv App ID when applicable
- Environment: Demo / Real
- Connected Deriv account identifier(s), masked where appropriate
- Token/scopes status without revealing secret
- Last successful validation
- Last error
- Reconnect / Replace credential
- Disconnect
- Test connection

## V1 local auth method: PAT
For local-first desktop-style use, PAT is the preferred initial method because Deriv documents PAT as suitable for desktop/native/non-web contexts.

User flow:
1. User signs into Deriv Trader.
2. Opens Settings > Connections > Deriv.
3. Chooses Personal Access Token.
4. Enters PAT and Deriv App ID.
5. Chooses/validates demo account context.
6. App performs server/local-worker validation.
7. Secret is stored only in the configured SecretStore.
8. UI never renders the PAT again.

REST requests using PAT include Deriv-App-ID as required by current Deriv docs.

## Future/hosted web method: OAuth 2.0 + PKCE
For the SaaS/web version, preferred onboarding:
Connect Deriv -> Deriv OAuth consent -> callback -> backend token exchange.

Current Deriv docs require:
- OAuth 2.0 Authorization Code + PKCE;
- random state validation;
- server-side token exchange;
- registered redirect URI;
- HTTPS callback;
- least-privilege scopes.

Do not assume refresh-token behavior not currently documented. Token/session renewal must be implemented only from verified Deriv documentation at that time.

## Least privilege
Request only the minimum scope required.
For trading functionality, prefer trade scope only where sufficient.
Do not request payment or account-management scopes unless a separately approved feature needs them.

## Multi-account policy
V1 user model may discover multiple Deriv accounts after authentication, but only one active trading connection/account context is selected per execution profile unless a later Work Order adds multi-account trading.

## Real-money gate
A valid user credential does NOT unlock real trading by itself.
REAL remains blocked by project governance until an explicit HIGH_ASSURANCE go-live gate is approved.
