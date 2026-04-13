import { nextJsConfig } from "@workspace/eslint-config/next-js";

export default [
  {
    ignores: [
      ".next/**",
      "dist/**",
      ".open-next/**",
      ".wrangler/**",
      "out/**",
      "build/**",
      "coverage/**",
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
      "sort-imports": "off",
      "no-duplicate-imports": "off",
      "no-restricted-imports": [
        "warn",
        {
          paths: [
            {
              name: "@/components/common/buttons",
              message:
                "Use @workspace/ui/components/button instead of app-local button primitives.",
            },
          ],
          patterns: ["../*", "../../*", "../../../*", "../../../../*"],
        },
      ],
      "no-restricted-syntax": [
        "warn",
        {
          selector:
            "Literal[value=/bg-(red|green|blue|yellow|amber|purple|pink|gray|slate|zinc|neutral|stone|orange|lime|emerald|teal|cyan|sky|indigo|violet|fuchsia|rose)-(50|100|200|300|400|500|600|700|800|900|950)/]",
          message:
            "Avoid hardcoded Tailwind background colors. Use semantic design tokens instead (e.g., bg-success, bg-destructive, bg-info). See packages/ui/docs/color-system.md",
        },
        {
          selector:
            "Literal[value=/text-(red|green|blue|yellow|amber|purple|pink|gray|slate|zinc|neutral|stone|orange|lime|emerald|teal|cyan|sky|indigo|violet|fuchsia|rose)-(50|100|200|300|400|500|600|700|800|900|950)/]",
          message:
            "Avoid hardcoded Tailwind text colors. Use semantic design tokens instead (e.g., text-success, text-destructive, text-info). See packages/ui/docs/color-system.md",
        },
        {
          selector:
            "Literal[value=/border-(red|green|blue|yellow|amber|purple|pink|gray|slate|zinc|neutral|stone|orange|lime|emerald|teal|cyan|sky|indigo|violet|fuchsia|rose)-(50|100|200|300|400|500|600|700|800|900|950)/]",
          message:
            "Avoid hardcoded Tailwind border colors. Use semantic design tokens instead (e.g., border-success, border-destructive, border-info). See packages/ui/docs/color-system.md",
        },
      ],
      "@next/next/no-img-element": "off",
    },
  },
  {
    files: ["app/(protected)/**/*.tsx", "app/portal/**/*.tsx"],
    rules: {
      "no-restricted-syntax": [
        "warn",
        {
          selector:
            "Literal[value=/bg-(red|green|blue|yellow|amber|purple|pink|gray|slate|zinc|neutral|stone|orange|lime|emerald|teal|cyan|sky|indigo|violet|fuchsia|rose)-(50|100|200|300|400|500|600|700|800|900|950)/]",
          message:
            "Avoid hardcoded Tailwind background colors. Use semantic design tokens instead (e.g., bg-success, bg-destructive, bg-info). See packages/ui/docs/color-system.md",
        },
        {
          selector:
            "Literal[value=/text-(red|green|blue|yellow|amber|purple|pink|gray|slate|zinc|neutral|stone|orange|lime|emerald|teal|cyan|sky|indigo|violet|fuchsia|rose)-(50|100|200|300|400|500|600|700|800|900|950)/]",
          message:
            "Avoid hardcoded Tailwind text colors. Use semantic design tokens instead (e.g., text-success, text-destructive, text-info). See packages/ui/docs/color-system.md",
        },
        {
          selector:
            "Literal[value=/border-(red|green|blue|yellow|amber|purple|pink|gray|slate|zinc|neutral|stone|orange|lime|emerald|teal|cyan|sky|indigo|violet|fuchsia|rose)-(50|100|200|300|400|500|600|700|800|900|950)/]",
          message:
            "Avoid hardcoded Tailwind border colors. Use semantic design tokens instead (e.g., border-success, border-destructive, border-info). See packages/ui/docs/color-system.md",
        },
        {
          selector: "Literal[value='Loading...']",
          message:
            "Use DataState or LoadingState for loading feedback in doctor/portal pages.",
        },
        {
          selector: "Literal[value=/container mx-auto p-4 md:p-6/]",
          message:
            "Use AppPageScaffold instead of ad-hoc container page spacing in doctor/portal pages.",
        },
        {
          selector: "Literal[value=/transition-all/]",
          message:
            "Avoid transition-all in doctor/portal route files. Use explicit transitions like transition-colors duration-150.",
        },
      ],
    },
  },
  {
    files: [
      "e2e/**/*.ts",
      "**/*.spec.ts",
      "**/*.spec.tsx",
      "**/*.test.ts",
      "**/*.test.tsx",
    ],
    rules: {
      "no-empty": "off",
      "no-useless-catch": "off",
    },
  },
];
