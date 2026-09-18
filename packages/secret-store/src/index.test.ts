import { describe, expect, it } from "vitest";
import { InMemorySecretStore } from "./index.js";
import type { UserId } from "@deriv-trader/domain";

describe("secret-store (in-memory adapter)", () => {
  it("round-trips without persisting to disk", async () => {
    const store = new InMemorySecretStore();
    const ref = { userId: "user_1" as UserId, key: "deriv_pat" };
    expect(await store.getSecret(ref)).toBeNull();
    await store.setSecret(ref, "s3cr3t");
    expect(await store.getSecret(ref)).toBe("s3cr3t");
    await store.deleteSecret(ref);
    expect(await store.getSecret(ref)).toBeNull();
  });

  it("refuses empty secrets", async () => {
    const store = new InMemorySecretStore();
    const ref = { userId: "user_1" as UserId, key: "deriv_pat" };
    await expect(store.setSecret(ref, "")).rejects.toThrow();
  });
});
