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
    exclude: ["e2e/**/*", "node_modules/**/*"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./"),
      "@workspace/ui": path.resolve(__dirname, "../../packages/ui"),
      "@workspace/types": path.resolve(__dirname, "../../packages/types"),
    },
  },
});
