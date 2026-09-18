import { describe, expect, it } from "vitest";
import { createEvent, isFoundationEventType } from "./index.js";

describe("events", () => {
  it("creates a canonical envelope", () => {
    const event = createEvent(
      "WORKER_READY",
      { message: "ready" },
      { buildSha: "abc123" },
    );
    expect(event.eventType).toBe("WORKER_READY");
    expect(event.schemaVersion).toBe("1.0.0");
    expect(event.buildSha).toBe("abc123");
    expect(typeof event.occurredAt).toBe("string");
  });

  it("validates event types", () => {
    expect(isFoundationEventType("WORKER_READY")).toBe(true);
    expect(isFoundationEventType("BOGUS")).toBe(false);
  });
});
