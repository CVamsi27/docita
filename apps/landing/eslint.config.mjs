import { nextJsConfig } from "@workspace/eslint-config/next-js";

export default [
  {
    ignores: [
      ".next/**",
      ".open-next/**",
      ".wrangler/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
    ],
  },
  ...nextJsConfig,
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      "no-empty": ["warn", { allowEmptyCatch: true }],
      "no-useless-catch": "warn",
      "no-console": ["error", { allow: ["warn", "error", "info"] }],
      "no-restricted-imports": [
        "warn",
        {
          patterns: ["../*", "../../*", "../../../*", "../../../../*"],
        },
      ],
    },
  },
];
