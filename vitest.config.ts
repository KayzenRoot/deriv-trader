import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: false,
    environment: "node",
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
