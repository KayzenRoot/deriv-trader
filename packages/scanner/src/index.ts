/**
 * Scanner boundary (DT-WP-01 Phase F).
 * Exposes scan request/result shapes without a payout engine.
 */
import type { ExpirySeconds } from "@deriv-trader/domain";
import type { Tick } from "@deriv-trader/market-data";

export interface ScanRequest {
  readonly symbol: string;
  readonly expirySeconds: ExpirySeconds;
  readonly at: string;
}

export type ScannerVerdict = "ELIGIBLE" | "INELIGIBLE" | "STALE_DATA";

export interface ScanResult {
  readonly request: ScanRequest;
  readonly verdict: ScannerVerdict;
  readonly reason: string;
  readonly tick: Tick | null;
}

export function ineligible(request: ScanRequest, reason: string): ScanResult {
  return { request, verdict: "INELIGIBLE", reason, tick: null };
}
