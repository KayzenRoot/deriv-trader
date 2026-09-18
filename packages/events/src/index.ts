/**
 * Canonical event schemas (DT-WP-01 Phase F).
 * Owns envelope creation shared by worker/persistence. No I/O here.
 */
import type { EventEnvelope, EventId } from "@deriv-trader/domain";
import { EVENT_SCHEMA_VERSION } from "@deriv-trader/domain";

export type FoundationEventType =
  | "WORKER_STARTED"
  | "WORKER_READY"
  | "WORKER_STOPPING"
  | "WORKER_STOPPED"
  | "CONFIG_LOADED"
  | "HEALTH_CHECKED";

/** Market/data/scanner lifecycle events (DT-WP-02). Read-only channel. */
export type MarketDataEventType =
  | "SYMBOLS_REFRESHED"
  | "CAPABILITY_REFRESHED"
  | "TICK_GAP_DETECTED"
  | "SCHEMA_MISMATCH_OBSERVED"
  | "PROPOSAL_STALE_OBSERVED"
  | "CONNECTION_STATE_CHANGED"
  | "BUDGET_THROTTLED"
  | "DATASET_FINALIZED"
  | "DATASET_QUARANTINED";

export interface FoundationEventPayload {
  readonly message: string;
  readonly buildSha?: string;
  readonly environment?: string;
}

let counter = 0;

export function createEvent<TType extends FoundationEventType>(
  eventType: TType,
  payload: FoundationEventPayload,
  context: {
    readonly buildSha: string;
    readonly occurredAt?: string;
    readonly correlationId?: string;
    readonly causationId?: string;
  },
): EventEnvelope<TType, FoundationEventPayload> {
  counter += 1;
  return {
    eventId: `evt_${Date.now().toString(36)}_${String(counter)}` as EventId,
    eventType,
    schemaVersion: EVENT_SCHEMA_VERSION,
    occurredAt: context.occurredAt ?? new Date().toISOString(),
    correlationId: context.correlationId,
    causationId: context.causationId,
    buildSha: context.buildSha,
    payload,
  };
}

export function isFoundationEventType(value: unknown): value is FoundationEventType {
  return (
    value === "WORKER_STARTED" ||
    value === "WORKER_READY" ||
    value === "WORKER_STOPPING" ||
    value === "WORKER_STOPPED" ||
    value === "CONFIG_LOADED" ||
    value === "HEALTH_CHECKED"
  );
}
