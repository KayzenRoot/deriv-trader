# V1 Deriv API Contract Tests

## Purpose
Prove our assumptions against the current API instead of trusting stale examples.

## Public tests
- connect to current public WebSocket;
- active_symbols response parses;
- contracts_for parses for representative symbols;
- tick subscription yields normalized events;
- unsubscribe/forget cleans subscription;
- ticks_history parses;
- proposal request/response parses where available;
- req_id correlation works;
- reconnect restores intended unique subscriptions.

## Authenticated demo tests
Using dedicated demo credentials only:
- obtain account-specific OTP;
- OTP WebSocket connects before expiry;
- expired/reused OTP fails as expected;
- demo connection is distinguishable from real;
- proposal/buy/open-contract lifecycle matches adapter types;
- ambiguous/disconnect scenarios exercise reconciliation.

## Schema tests
Fixtures cover current new API fields and documented compatibility changes.
Critical parser failures fail the contract suite.

## Rate-limit tests
Do not intentionally abuse production limits.
Use simulated budget-manager tests plus small safe real/demo pacing tests.

## Secrets
CI/public tests requiring no auth run without credentials.
Authenticated demo tests run only in a trusted local/secret-enabled environment.
