import { defineConfig } from "playwright/test";

// DT-WP-01 foundation: Playwright is pinned for later E2E work packages.
// No E2E flows are claimed in the foundation; this config proves the toolchain
// resolves without requiring browsers, paid services, or live connections.
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:3000",
    trace: "off",
  },
});
