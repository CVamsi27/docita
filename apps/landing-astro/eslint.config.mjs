import { config as baseConfig } from "@workspace/eslint-config/base";

export default [
  ...baseConfig,
  {
    ignores: ["dist/**", ".astro/**", "coverage/**", "playwright-report/**", "test-results/**"],
    rules: {
      "no-console": ["error", { allow: ["warn", "error", "info"] }],
      "no-restricted-imports": [
        "warn",
        {
          patterns: ["../*", "../../*", "../../../*", "../../../../*"]
        }
      ]
    }
  }
];
