import { describe, expect, it } from "vitest";
import {
  EXPIRY_SECONDS,
  isExpirySeconds,
  EVENT_SCHEMA_VERSION,
  CONFIG_SCHEMA_VERSION,
} from "./index.js";

describe("domain vocabulary", () => {
  it("constrains expiries to 60/180/300", () => {
    expect([...EXPIRY_SECONDS]).toEqual([60, 180, 300]);
    expect(isExpirySeconds(60)).toBe(true);
    expect(isExpirySeconds(180)).toBe(true);
    expect(isExpirySeconds(300)).toBe(true);
    expect(isExpirySeconds(120)).toBe(false);
    expect(isExpirySeconds("60")).toBe(false);
  });

  it("pins canonical schema versions", () => {
    expect(EVENT_SCHEMA_VERSION).toBe("1.0.0");
    expect(CONFIG_SCHEMA_VERSION).toBe("1.0.0");
  });
});
