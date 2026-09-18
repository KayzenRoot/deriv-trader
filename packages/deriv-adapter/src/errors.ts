/**
 * Broker error mapping: raw code/message → typed category (DT-WP-02).
 * Output carries only the broker code (for audit correlation) and the safe
 * category — never raw payloads, secrets or tokens.
 */
import type { BrokerErrorCategory } from "@deriv-trader/domain";
import { safeMessageFor } from "@deriv-trader/domain";

export interface NormalizedBrokerError {
  readonly category: BrokerErrorCategory;
  readonly brokerCode: string;
  readonly safeMessage: string;
}

const CODE_MAP: [RegExp, BrokerErrorCategory][] = [
  [/rate.?limit|too_many_requests|429/i, "RATE_LIMITED"],
  [/input.*valid|validation/i, "VALIDATION_ERROR"],
  [/contract.*(unavail|not.*support|invalid)|unsupported.*contract/i, "UNSUPPORTED_CONTRACT"],
  [/market.*(closed|suspend|unavail)|trading.*suspend/i, "MARKET_UNAVAILABLE"],
  [/proposal.*(expir|stale)|stale.*price/i, "PROPOSAL_STALE"],
  [/proposal.*reject/i, "PROPOSAL_REJECTED"],
  [/buy.*reject|order.*reject/i, "BUY_REJECTED"],
  [/authori[sz]ation.*(expir|revok)|token.*(expir|revok|invalid)/i, "AUTH_EXPIRED_OR_REVOKED"],
  [/invalid.*token|authori[sz]ation.*requir|unauthori[sz]ed|auth.*fail/i, "AUTH_INVALID"],
  [/app.*id.*invalid|invalid.*app/i, "APP_ID_INVALID"],
  [/otp.*expir/i, "OTP_EXPIRED"],
  [/otp.*invalid/i, "OTP_INVALID"],
  [/permission|scope/i, "PERMISSION_SCOPE"],
  [/disconnect|connection.*(lost|reset|abort)|socket.*hang/i, "CONNECTION_LOST"],
  [/timeout|econn|network|temporar/i, "NETWORK_TRANSIENT"],
  [/schema|parse|unexpected.*response/i, "SCHEMA_MISMATCH"],
  [/internal|server.*error|service.*unavail/i, "BROKER_INTERNAL"],
];

export function mapBrokerError(code: string | null, message: string | null): NormalizedBrokerError {
  const haystack = `${code ?? ""} ${message ?? ""}`;
  for (const [pattern, category] of CODE_MAP) {
    if (pattern.test(haystack)) {
      return { category, brokerCode: code ?? "unknown", safeMessage: safeMessageFor(category) };
    }
  }
  return {
    category: "UNKNOWN_FAIL_CLOSED",
    brokerCode: code ?? "unknown",
    safeMessage: safeMessageFor("UNKNOWN_FAIL_CLOSED"),
  };
}

/** Extract code/message strings from an unknown broker error payload safely. */
export function extractErrorParts(payload: unknown): { code: string | null; message: string | null } {
  if (typeof payload !== "object" || payload === null) return { code: null, message: null };
  const record = payload as Record<string, unknown>;
  const error = record["error"];
  if (typeof error !== "object" || error === null) return { code: null, message: null };
  const errRecord = error as Record<string, unknown>;
  const rawCode = errRecord["code"];
  const rawMessage = errRecord["message"];
  const code = typeof rawCode === "string" ? rawCode.slice(0, 120) : null;
  const message = typeof rawMessage === "string" ? rawMessage.slice(0, 200) : null;
  return { code, message };
}
