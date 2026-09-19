import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: false,
    environment: "node",
    // Fastify/duckdb imports can contend with the full workspace run on
    // Windows; individual tests still set tighter limits where appropriate.
    testTimeout: 30_000,
    include: [
      "packages/*/src/**/*.test.ts",
      "apps/trader/src/**/*.test.ts",
      "apps/web/**/*.test.{ts,tsx}",
      "tests/**/*.test.ts",
    ],
    coverage: {
      enabled: false,
    },
  },
});
