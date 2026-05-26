import { configDefaults, defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    css: true,
    testTimeout: 30000,
    exclude: [
      ...configDefaults.exclude,
      "e2e/**",
      "tests/visual/**",
      ".next/**",
      ".open-next/**",
      "test-results/**",
    ],
    coverage: {
      reporter: ["text", "html"],
      include: [
        "features/**/rules/**/*.ts",
        "shared/lib/rules/**/*.ts",
        "shared/lib/access-control/rules/**/*.ts",
        "shared/lib/errors/**/*.ts",
        "shared/components/whatsapp/whatsapp-button.tsx",
        "shared/components/feedback/delete-confirm-dialog.tsx",
        "features/appointments/components/sections/add-dialog/AppointmentFormFields.tsx",
        "features/onboarding/components/steps/PaymentStep.tsx",
        "features/patients/components/forms/PatientDialogs.tsx",
        "features/consultation/components/consultation.tsx",
        "providers/react-query-provider.tsx",
      ],
      exclude: [
        "e2e/**",
        "**/*.d.ts",
        "**/*.config.*",
        "**/.next/**",
        "**/.open-next/**",
      ],
      thresholds: {
        lines: 30,
        statements: 30,
        functions: 30,
        branches: 25,
      },
    },
  },
  resolve: {
    alias: [
      {
        find: /^@\/components\/(.*)$/,
        replacement: path.resolve(__dirname, "./shared/components/$1"),
      },
      {
        find: /^@\/hooks\/(.*)$/,
        replacement: path.resolve(__dirname, "./shared/hooks/$1"),
      },
      {
        find: /^@\/lib\/(.*)$/,
        replacement: path.resolve(__dirname, "./shared/lib/$1"),
      },
      {
        find: /^@\/(.*)$/,
        replacement: path.resolve(__dirname, "./$1"),
      },
      {
        find: "@workspace/ui",
        replacement: path.resolve(__dirname, "../../packages/ui/src"),
      },
      {
        find: "@workspace/types",
        replacement: path.resolve(__dirname, "../../packages/types/src"),
      },
      {
        find: "@workspace/utils",
        replacement: path.resolve(__dirname, "../../packages/utils/src"),
      },
      {
        find: "@workspace/hooks",
        replacement: path.resolve(__dirname, "../../packages/hooks/src"),
      },
      {
        find: "@workspace/data-access",
        replacement: path.resolve(__dirname, "../../packages/data-access/src"),
      },
    ],
  },
});
