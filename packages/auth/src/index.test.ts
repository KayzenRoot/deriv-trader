import { describe, expect, it } from "vitest";
import { createAuthClient, toAuthUser } from "./index.js";

describe("auth boundary", () => {
  it("returns null client without credentials (offline-safe)", () => {
    expect(createAuthClient({})).toBeNull();
    expect(createAuthClient({ url: "", anonKey: "" })).toBeNull();
  });

  it("builds typed users without a live project", () => {
    const user = toAuthUser("user_1", "dev@example.com", "ADMIN");
    expect(user.role).toBe("ADMIN");
    expect(user.email).toBe("dev@example.com");
  });
});
