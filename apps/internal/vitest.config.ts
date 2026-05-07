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
      ".next/**",
      ".open-next/**",
      "test-results/**",
    ],
    coverage: {
      reporter: ["text", "html"],
      include: [
        "app/page.tsx",
        "app/(protected)/dashboard/page.tsx",
        "features/users/users.utils.ts",
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
      "@workspace/auth": path.resolve(__dirname, "../../packages/auth/src"),
    },
  },
});
