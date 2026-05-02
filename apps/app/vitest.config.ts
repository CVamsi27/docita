import { defineConfig } from "vitest/config";
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
    exclude: ["e2e*", "node_modules*", "tests/visual/**"],
    coverage: {
      reporter: ["text", "html"],
      include: [
        "features/**/rules/**/*.ts",
        "lib/rules/**/*.ts",
        "lib/access-control/rules/**/*.ts",
        "lib/errors/**/*.ts",
        "features/_shared/components/whatsapp/whatsapp-button.tsx",
        "features/_shared/components/feedback/delete-confirm-dialog.tsx",
        "features/appointments/components/sections/add-dialog/AppointmentFormFields.tsx",
        "features/onboarding/components/steps/PaymentStep.tsx",
        "features/patients/components/forms/PatientDialogs.tsx",
        "features/consultation/components/consultation.tsx",
        "providers/react-query-provider.tsx",
      ],
      exclude: [
        "e2e/**",
        "tests/visual/**",
        "**/*.d.ts",
        "**/*.config.*",
        "**/.next/**",
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
    alias: {
      "@": path.resolve(__dirname, "./"),
      "@workspace/ui": path.resolve(__dirname, "../../packages/ui/src"),
      "@workspace/types": path.resolve(__dirname, "../../packages/types/src"),
      "@workspace/utils": path.resolve(__dirname, "../../packages/utils/src"),
      "@workspace/hooks": path.resolve(__dirname, "../../packages/hooks/src"),
      "@workspace/data-access": path.resolve(
        __dirname,
        "../../packages/data-access/src",
      ),
    },
  },
});
