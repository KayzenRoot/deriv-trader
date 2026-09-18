import { describe, expect, it } from "vitest";
import { FOUNDATION_LABEL, echartsSmoko } from "./foundation.js";

describe("web foundation", () => {
  it("labels the shell as demo/foundation", () => {
    expect(FOUNDATION_LABEL).toBe("DEMO / FOUNDATION");
  });

  it("proves echarts dependency loads", () => {
    expect(echartsSmoko()).toBe("2026-09-18");
  });
});
