import { config as baseConfig } from "@workspace/eslint-config/base";
import astroParser from "astro-eslint-parser";
import tsParser from "@typescript-eslint/parser";

export default [
  ...baseConfig,
  {
    ignores: [
      "dist/**",
      ".astro/**",
      "coverage/**",
      "playwright-report/**",
      "test-results/**",
    ],
    rules: {
      // Astro derives DEV from the build mode; it is not an environment input.
      "turbo/no-undeclared-env-vars": ["warn", { allowList: ["DEV"] }],
      "no-console": ["error", { allow: ["warn", "error", "info"] }],
      "no-restricted-imports": [
        "warn",
        {
          patterns: ["../*", "../../*", "../../../*", "../../../../*"],
        },
      ],
    },
  },
  {
    files: ["src/**/*.{ts,tsx,astro}"],
    rules: {
      "no-restricted-syntax": [
        "warn",
        {
          selector:
            "Literal[value=/bg-(red|green|blue|yellow|amber|purple|pink|gray|slate|zinc|neutral|stone|orange|lime|emerald|teal|cyan|sky|indigo|violet|fuchsia|rose)-(50|100|200|300|400|500|600|700|800|900|950)/]",
          message:
            "Avoid hardcoded Tailwind background colors. Use semantic design tokens instead.",
        },
        {
          selector:
            "Literal[value=/text-(red|green|blue|yellow|amber|purple|pink|gray|slate|zinc|neutral|stone|orange|lime|emerald|teal|cyan|sky|indigo|violet|fuchsia|rose)-(50|100|200|300|400|500|600|700|800|900|950)/]",
          message:
            "Avoid hardcoded Tailwind text colors. Use semantic design tokens instead.",
        },
        {
          selector:
            "Literal[value=/border-(red|green|blue|yellow|amber|purple|pink|gray|slate|zinc|neutral|stone|orange|lime|emerald|teal|cyan|sky|indigo|violet|fuchsia|rose)-(50|100|200|300|400|500|600|700|800|900|950)/]",
          message:
            "Avoid hardcoded Tailwind border colors. Use semantic design tokens instead.",
        },
        {
          selector:
            "Literal[value=/text-3xl font-bold tracking-tight sm:text-4xl/]",
          message:
            "Use SectionHeading for marketing section titles instead of repeating ad-hoc typography classes.",
        },
        {
          selector: "Literal[value=/container mx-auto px-6/]",
          message:
            "Use the shared page shell patterns instead of ad-hoc section container classes.",
        },
        {
          selector:
            "JSXAttribute[name.name='animation'] > Literal[value='wave']",
          message:
            "Skeleton animation=\"wave\" is banned by docs/ui/UI_UX_STANDARD_2026.md §5. Drop the prop; Skeleton is now static.",
        },
        {
          selector: "Literal[value=/\\banimate-pulse\\b/]",
          message:
            "animate-pulse is banned by docs/ui/UI_UX_STANDARD_2026.md §5. Use static styling for emphasis instead.",
        },
        {
          selector: "TemplateElement[value.cooked=/\\banimate-pulse\\b/]",
          message:
            "animate-pulse is banned by docs/ui/UI_UX_STANDARD_2026.md §5. Use static styling for emphasis instead.",
        },
      ],
    },
  },
  {
    files: ["src/**/*.astro"],
    languageOptions: {
      parser: astroParser,
      parserOptions: {
        parser: tsParser,
        ecmaVersion: 2022,
        sourceType: "module",
      },
      globals: {
        Astro: "readonly",
        URL: "readonly",
      },
    },
  },
];
