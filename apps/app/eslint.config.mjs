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
      "no-restricted-syntax": [
        "warn",
        {
          selector: "Literal[value=/bg-(red|green|blue|yellow|amber|purple|pink|gray|slate|zinc|neutral|stone|orange|lime|emerald|teal|cyan|sky|indigo|violet|fuchsia|rose)-(50|100|200|300|400|500|600|700|800|900|950)/]",
          message: "Avoid hardcoded Tailwind background colors. Use semantic design tokens instead (e.g., bg-success, bg-destructive, bg-info). See packages/ui/docs/color-system.md",
        },
        {
          selector: "Literal[value=/text-(red|green|blue|yellow|amber|purple|pink|gray|slate|zinc|neutral|stone|orange|lime|emerald|teal|cyan|sky|indigo|violet|fuchsia|rose)-(50|100|200|300|400|500|600|700|800|900|950)/]",
          message: "Avoid hardcoded Tailwind text colors. Use semantic design tokens instead (e.g., text-success, text-destructive, text-info). See packages/ui/docs/color-system.md",
        },
        {
          selector: "Literal[value=/border-(red|green|blue|yellow|amber|purple|pink|gray|slate|zinc|neutral|stone|orange|lime|emerald|teal|cyan|sky|indigo|violet|fuchsia|rose)-(50|100|200|300|400|500|600|700|800|900|950)/]",
          message: "Avoid hardcoded Tailwind border colors. Use semantic design tokens instead (e.g., border-success, border-destructive, border-info). See packages/ui/docs/color-system.md",
        },
      ],
    },
  },
];
