import js from "@eslint/js";
import tseslint from "typescript-eslint";
import globals from "globals";

export default tseslint.config(
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/build/**",
      "**/.next/**",
      "**/out/**",
      "**/coverage/**",
      "**/*.tsbuildinfo",
      "**/next-env.d.ts",
      "data/runtime/**",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  {
    languageOptions: {
      globals: {
        ...globals.node,
      },
      parserOptions: {
        // Dedicated lint project: resolves workspace imports to source via
        // paths (tsconfig.lint.json), so `npm run lint` passes on a clean
        // checkout with no dist artifacts. Build/typecheck still use project
        // references + dist and remain the authority for emit.
        project: ["./tsconfig.lint.json"],
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { prefer: "type-imports", fixStyle: "separate-type-imports" },
      ],
      "no-console": ["warn", { allow: ["warn", "error"] }],
      "no-eval": "error",
    },
  },
  {
    files: ["**/*.mjs", "**/*.cjs", "**/*.js"],
    extends: [tseslint.configs.disableTypeChecked],
    rules: {
      "no-console": "off",
    },
  },
  {
    files: ["apps/web/**/*.{ts,tsx}"],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    rules: {
      // Web cannot own broker secrets: keep the boundary visible in review.
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["**/secret-store*", "@deriv-trader/secret-store"],
              message:
                "Browser/UI code must not import SecretStore (V1-SECURITY-BOUNDARIES).",
            },
          ],
        },
      ],
    },
  },
);
