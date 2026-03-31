import { nextJsConfig } from "@workspace/eslint-config/next-js";

export default [
  {
    ignores: [
      ".next/**",
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
      "@typescript-eslint/no-unused-vars": "off",
      "no-restricted-imports": [
        "warn",
        {
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
