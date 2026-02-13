import { nextJsConfig } from "@workspace/eslint-config/next-js";
import globals from "globals";

/** @type {import("eslint").Linter.Config} */
export default [
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "dist/**",
      "build/**",
      "coverage/**",
      "*.d.ts",
      "playwright-report/**",
      "test-results/**",
    ],
  },
  {
    files: ["next.config.mjs", "postcss.config.mjs", "tailwind.config.ts"],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },
  ...nextJsConfig,
];
