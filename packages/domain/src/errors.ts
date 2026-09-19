/**
 * Broker error taxonomy vocabulary (DT-WP-02 Phase B).
 * External failures become deterministic internal categories; strategies never
 * react to raw broker strings. No credentials or raw payloads are stored here.
 */

export type BrokerErrorCategory =
  | "AUTH_INVALID"
  | "AUTH_EXPIRED_OR_REVOKED"
  | "APP_ID_INVALID"
  | "OTP_EXPIRED"
  | "OTP_INVALID"
  | "RATE_LIMITED"
  | "VALIDATION_ERROR"
  | "UNSUPPORTED_CONTRACT"
  | "MARKET_UNAVAILABLE"
  | "PROPOSAL_STALE"
  | "PROPOSAL_REJECTED"
  | "BUY_REJECTED"
  | "UNKNOWN_BUY_RESULT"
  | "CONNECTION_LOST"
  | "NETWORK_TRANSIENT"
  | "SCHEMA_MISMATCH"
  | "BROKER_INTERNAL"
  | "PERMISSION_SCOPE"
  | "UNKNOWN_FAIL_CLOSED";

export type RetryClass =
  | "SAFE_RETRY"
  | "RECONCILE_BEFORE_RETRY"
  | "DO_NOT_RETRY_WITHOUT_CHANGE";

const RETRY_CLASS: Record<BrokerErrorCategory, RetryClass> = {
  AUTH_INVALID: "DO_NOT_RETRY_WITHOUT_CHANGE",
  AUTH_EXPIRED_OR_REVOKED: "DO_NOT_RETRY_WITHOUT_CHANGE",
  APP_ID_INVALID: "DO_NOT_RETRY_WITHOUT_CHANGE",
  OTP_EXPIRED: "DO_NOT_RETRY_WITHOUT_CHANGE",
  OTP_INVALID: "DO_NOT_RETRY_WITHOUT_CHANGE",
  RATE_LIMITED: "SAFE_RETRY",
  VALIDATION_ERROR: "DO_NOT_RETRY_WITHOUT_CHANGE",
  UNSUPPORTED_CONTRACT: "DO_NOT_RETRY_WITHOUT_CHANGE",
  MARKET_UNAVAILABLE: "SAFE_RETRY",
  PROPOSAL_STALE: "SAFE_RETRY",
  PROPOSAL_REJECTED: "DO_NOT_RETRY_WITHOUT_CHANGE",
  BUY_REJECTED: "DO_NOT_RETRY_WITHOUT_CHANGE",
  UNKNOWN_BUY_RESULT: "RECONCILE_BEFORE_RETRY",
  CONNECTION_LOST: "SAFE_RETRY",
  NETWORK_TRANSIENT: "SAFE_RETRY",
  SCHEMA_MISMATCH: "DO_NOT_RETRY_WITHOUT_CHANGE",
  BROKER_INTERNAL: "SAFE_RETRY",
  PERMISSION_SCOPE: "DO_NOT_RETRY_WITHOUT_CHANGE",
  UNKNOWN_FAIL_CLOSED: "DO_NOT_RETRY_WITHOUT_CHANGE",
};

export function retryClassFor(category: BrokerErrorCategory): RetryClass {
  return RETRY_CLASS[category];
}

/** Safe user-facing message; never includes raw broker payloads. */
const SAFE_MESSAGE: Record<BrokerErrorCategory, string> = {
  AUTH_INVALID: "Deriv connection expired/revoked",
  AUTH_EXPIRED_OR_REVOKED: "Deriv connection expired/revoked",
  APP_ID_INVALID: "Deriv App ID is invalid",
  OTP_EXPIRED: "Deriv session expired; reconnect to continue",
  OTP_INVALID: "Deriv session invalid; reconnect to continue",
  RATE_LIMITED: "API request budget temporarily constrained",
  VALIDATION_ERROR: "Request rejected by broker validation",
  UNSUPPORTED_CONTRACT: "Contract no longer available",
  MARKET_UNAVAILABLE: "Market currently unavailable",
  PROPOSAL_STALE: "Quote is stale; refresh before use",
  PROPOSAL_REJECTED: "Quote rejected by broker",
  BUY_REJECTED: "Order rejected by broker",
  UNKNOWN_BUY_RESULT: "Order result ambiguous; reconciling before retry",
  CONNECTION_LOST: "Broker connection lost; reconnecting",
  NETWORK_TRANSIENT: "Temporary network issue; retrying",
  SCHEMA_MISMATCH: "Unexpected broker response shape; failing closed",
  BROKER_INTERNAL: "Broker internal error; retrying with backoff",
  PERMISSION_SCOPE: "Insufficient API permission scope",
  UNKNOWN_FAIL_CLOSED: "Unknown broker condition; failing closed",
};

export function safeMessageFor(category: BrokerErrorCategory): string {
  return SAFE_MESSAGE[category];
}
