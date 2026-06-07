import { configDefaults, defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { buildAppVitestConfig } from "../../vitest.shared.config";

export default defineConfig({
  plugins: [react()],
  ...buildAppVitestConfig({
    rootDir: __dirname,
    coverageInclude: [
      "app/page.tsx",
      "app/(protected)/dashboard/page.tsx",
      "features/users/users.utils.ts",
    ],
    defaultExclude: configDefaults.exclude,
    setupFiles: ["./vitest.setup.ts"],
  }),
});
