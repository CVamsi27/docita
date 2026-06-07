import { configDefaults, defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { buildAppVitestConfig } from "../../vitest.shared.config";

export default defineConfig({
  plugins: [react()],
  ...buildAppVitestConfig({
    rootDir: __dirname,
    extraExclude: ["tests/visual/**"],
    coverageInclude: [
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
    defaultExclude: configDefaults.exclude,
    setupFiles: ["./vitest.setup.ts"],
  }),
});
