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
    files: ["app/**/*.tsx", "components/**/*.tsx", "features/**/*.tsx"],
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
          paths: [
            {
              name: "@workspace/types",
              importNames: [
                "CreatePatientInput",
                "UpdatePatientInput",
                "CreateAppointmentInput",
                "UpdateAppointmentInput",
                "CreateInvoiceInput",
                "CreatePrescriptionInput",
              ],
              message:
                "Prefer contract request types from @workspace/types (e.g., Create*Request / Update*Request from contracts) for API calls.",
            },
          ],
        },
      ],
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
          selector: "Literal[value=/space-y-6 p-6/]",
          message:
            "Use AppPageScaffold or PageContainer instead of ad-hoc page padding and stack spacing.",
        },
        {
          selector: "Literal[value=/text-2xl sm:text-3xl font-bold/]",
          message:
            "Use PageHeader or SectionHeading for page titles instead of hardcoded heading scales.",
        },
        {
          selector:
            "Literal[value=/bg-background rounded-lg border border-border p-6/]",
          message:
            "Use Card or Section primitives for panel shells instead of repeating border/padding classes.",
        },
        {
          selector:
            "JSXAttribute[name.name='animation'] > Literal[value='wave']",
          message:
            "Skeleton animation=\"wave\" is banned by docs/ui/UI_UX_STANDARD_2026.md \u00a75. Drop the prop; Skeleton is now static.",
        },
        {
          selector: "Literal[value=/\\banimate-pulse\\b/]",
          message:
            "animate-pulse is banned by docs/ui/UI_UX_STANDARD_2026.md \u00a75. Use static styling for emphasis instead.",
        },
        {
          selector: "TemplateElement[value.cooked=/\\banimate-pulse\\b/]",
          message:
            "animate-pulse is banned by docs/ui/UI_UX_STANDARD_2026.md \u00a75. Use static styling for emphasis instead.",
        },
      ],
    },
  },
];
