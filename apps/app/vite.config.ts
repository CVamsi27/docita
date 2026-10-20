import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

import { fileURLToPath } from "node:url";
const __dirname = fileURLToPath(new URL(".", import.meta.url));

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
  server: {
    port: 3000,
    proxy: {
      "/api": {
        target: process.env.VITE_API_TARGET || "http://localhost:3001",
        changeOrigin: true,
      },
      "/socket.io": {
        target: process.env.VITE_API_TARGET || "http://localhost:3001",
        ws: true,
      },
    },
  },
  build: {
    target: "es2021",
    minify: "esbuild",
    cssMinify: true,
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes("node_modules/react-dom") || id.includes("node_modules/react-router")) return "vendor";
          if (id.includes("node_modules/lucide-react") || id.includes("node_modules/recharts")) return "ui";
          if (id.includes("node_modules/@tanstack/react-query") || id.includes("node_modules/zustand")) return "data";
        },
      },
    },
    sourcemap: false,
  },
  define: {
    "process.env.VITE_API_URL": JSON.stringify(
      process.env.VITE_API_URL || "/api/v1",
    ),
    "process.env.VITE_APP_URL": JSON.stringify(
      process.env.VITE_APP_URL || "http://localhost:3000",
    ),
    "process.env.VITE_SOCKET_URL": JSON.stringify(
      process.env.VITE_SOCKET_URL || "http://localhost:3001",
    ),
    "process.env.VITE_SENTRY_DSN": JSON.stringify(
      process.env.VITE_SENTRY_DSN || "",
    ),
    "process.env.VITE_AI_ENABLED": JSON.stringify(
      process.env.VITE_AI_ENABLED || "false",
    ),
    "process.env.NODE_ENV": JSON.stringify(process.env.NODE_ENV || "development"),
  },
});
