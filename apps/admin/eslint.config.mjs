import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,

  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),

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
]);

export default eslintConfig;
