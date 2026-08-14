import { defineConfig } from "vitest/config";
import path from "path";

const __dirname = import.meta.dirname;

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
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
    include: ["src/**/*.test.{ts,tsx}"],
  },
});
