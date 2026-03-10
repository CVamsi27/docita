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
      "@typescript-eslint/no-unused-vars": "off",
      "no-empty": "off",
      "no-useless-catch": "off",
      "sort-imports": "off",
      "no-duplicate-imports": "off",
      "react-hooks/rules-of-hooks": "off",
    },
  },
];
