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
    },
  },
];
