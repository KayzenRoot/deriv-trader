# V1 Secret Storage Architecture

## Rule
Deriv PATs/OAuth tokens are secrets. They must never be:
- committed to Git;
- stored in browser localStorage/sessionStorage as long-lived credentials;
- written to audit logs;
- returned by normal user APIs after initial save;
- copied into analytics/reporting payloads.

## SecretStore abstraction
The Deriv adapter depends on a SecretStore interface rather than a storage vendor.

### Local V1 adapter — OS Credential Store
Preferred for local-first V1:
- Windows Credential Manager / OS keychain-class storage;
- key namespace bound to Deriv Trader user UUID + connection ID;
- operational database stores metadata/reference only, not plaintext token.

This keeps the trading secret on the user's machine during the local phase.

### Hosted/SaaS adapter — encrypted server-side secret store
Preferred future adapter:
- Supabase Vault or equivalent managed secret/KMS-backed storage;
- secret access only from trusted server/backend role;
- user table stores secret reference, never decrypted value;
- client/browser never gets service-role or Vault decryption access.

Supabase Vault currently stores secrets encrypted/authenticated at rest and exposes decryption through privileged database access. Permissions to decrypted views must be tightly restricted.

## Secret lifecycle
CREATED -> VALIDATED -> ACTIVE -> ROTATED/REPLACED -> REVOKED/DISCONNECTED.

## Redaction
Logs show only safe metadata:
- connection_id;
- auth_method;
- last4/hash fingerprint if safe/useful;
- scopes;
- validation timestamp;
- status/error category.

Never log token bodies or authorization codes.

## Migration
Local credentials can later be migrated to hosted encrypted storage only with explicit user action/consent and a dedicated migration flow.
