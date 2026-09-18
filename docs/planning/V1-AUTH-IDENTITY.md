# V1 Authentication & Identity

Verified planning date: 2026-09-18.

## Decision
Use Supabase Auth for Deriv Trader user authentication in V1.

## Why Supabase Auth
- already selected as V1 operational Postgres platform;
- Free plan currently includes 50,000 MAU;
- native integration with Postgres and Row Level Security;
- supports password, magic link/OTP, social login and SSO/OIDC options;
- avoids adding a second paid identity vendor during the free-first phase.

Privy was evaluated but not selected for V1:
- current Developer Free tier covers 0-499 MAU;
- next published tier starts at $299/month for 500-2,499 MAU;
- much of Privy's differentiating value is embedded-wallet/onchain infrastructure, which Deriv Trader does not need.

## V1 login methods
Initial UX:
1. Email + password OR email magic link/OTP.
2. Google login can be enabled if desired without changing the architecture.
3. Future optional MFA after initial product validation.

## Authorization
Roles:
- user/operator
- admin

Supabase JWT identifies the Deriv Trader user.
RLS protects all user-owned operational tables.
Admin actions use explicit admin authorization, never merely client-side hidden routes.

## Separation of identities
Deriv Trader login is NOT the same as Deriv account authentication.

A user:
1. signs into Deriv Trader via Supabase Auth;
2. then configures/connects their Deriv account in Settings.

This separation is mandatory.
