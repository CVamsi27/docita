import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

const __dirname = import.meta.dirname;

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@workspace/auth": path.resolve(__dirname, "../../packages/auth/src"),
      "@workspace/ui": path.resolve(__dirname, "../../packages/ui/src"),
      "@workspace/types": path.resolve(__dirname, "../../packages/types/src"),
      "@workspace/utils": path.resolve(__dirname, "../../packages/utils/src"),
      "@workspace/hooks": path.resolve(__dirname, "../../packages/hooks/src"),
      "@workspace/data-access": path.resolve(__dirname, "../../packages/data-access/src"),
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    css: true,
    testTimeout: 30000,
    exclude: ["e2e/**", "dist/**", "node_modules/**"],
    coverage: {
      reporter: ["text", "html"],
      exclude: ["e2e/**", "**/*.d.ts", "**/*.config.*", "dist/**"],
    },
  },
});
