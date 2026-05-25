import { config } from "@workspace/eslint-config/base";

export default [
  ...config,
  {
    files: ["src/**/*.{ts,tsx,js,jsx}"],
    rules: {
      "no-restricted-syntax": [
        "warn",
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
