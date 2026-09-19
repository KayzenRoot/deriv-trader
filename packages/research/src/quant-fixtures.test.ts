import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import type { MarketTick, ProposalQuote } from "@deriv-trader/domain";
import { runLab } from "./lab.js";

const HERE = dirname(fileURLToPath(import.meta.url));

function loadFixture(): { ticks: MarketTick[]; proposals: ProposalQuote[] } {
  const dir = join(HERE, "..", "fixtures", "quant-v1");
  return {
    ticks: JSON.parse(readFileSync(join(dir, "ticks.json"), "utf8")) as MarketTick[],
    proposals: JSON.parse(readFileSync(join(dir, "proposals.json"), "utf8")) as ProposalQuote[],
  };
}

describe("committed quant fixtures", () => {
  it("replays deterministically with honest verdicts", () => {
    const { ticks, proposals } = loadFixture();
    expect(ticks).toHaveLength(600);
    const dataset = { ticks, proposals, datasetHash: "quant-fixture-v1", grade: "synthetic" as const };
    const first = runLab(dataset, { seed: 7, codeVersion: "test-1", configHash: "cfg" });
    const second = runLab(dataset, { seed: 7, codeVersion: "test-1", configHash: "cfg" });
    expect(first.verdicts).toEqual(second.verdicts);
    expect(first.verdicts).toHaveLength(15);
    // Synthetic grade: machinery proven, edge unproven — never ENABLED.
    for (const verdict of first.verdicts) {
      expect(verdict.state).toBe("RETEST_REQUIRED");
    }
    expect(first.ledger.attempts.length).toBe(second.ledger.attempts.length);
    expect(first.ledger.attempts.every((a) => a.fold !== "test")).toBe(true);
  }, 300000);
});
