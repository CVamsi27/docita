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
      "@workspace/ui": path.resolve(__dirname, "../../packages/ui/src"),
      "@workspace/types": path.resolve(__dirname, "../../packages/types/src"),
      "@workspace/utils": path.resolve(__dirname, "../../packages/utils/src"),
      "@workspace/hooks": path.resolve(__dirname, "../../packages/hooks/src"),
      "@workspace/data-access": path.resolve(__dirname, "../../packages/data-access/src"),
    },
  },
  server: {
    port: 3002,
    proxy: {
      "/api": {
        target: process.env.VITE_API_TARGET || "http://localhost:3001",
        changeOrigin: true,
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
          // UI utilities (form, toast, head) — check before bare "react" match
          if (id.includes("node_modules/react-hook-form") || id.includes("node_modules/sonner") || id.includes("node_modules/react-helmet-async")) return "ui-deps";
          // Core React (react + react-dom, excludes react-helmet-async caught above)
          if (id.includes("node_modules/react") && !id.includes("react-router")) return "react-vendor";
          // React Router — loaded only for authenticated routes
          if (id.includes("node_modules/react-router")) return "router-vendor";
          // TanStack Query + Zustand — state & data layer
          if (id.includes("node_modules/@tanstack/react-query") || id.includes("node_modules/zustand")) return "data";
          // UI icons
          if (id.includes("node_modules/lucide-react")) return "icons";
        },
        chunkFileNames: "assets/[name]-[hash].js",
        entryFileNames: "assets/[name]-[hash].js",
      },
    },
    sourcemap: false,
  },
  define: {
    "process.env.VITE_API_URL": JSON.stringify(process.env.VITE_API_URL || "/api/v1"),
    "process.env.VITE_APP_URL": JSON.stringify(process.env.VITE_APP_URL || "http://localhost:3002"),
    "process.env.VITE_MAIN_APP_URL": JSON.stringify(process.env.VITE_MAIN_APP_URL || "https://app.docita.work"),
    "process.env.VITE_SENTRY_DSN": JSON.stringify(process.env.VITE_SENTRY_DSN || ""),
    "process.env.NODE_ENV": JSON.stringify(process.env.NODE_ENV || "development"),
  },
  envPrefix: "VITE_",
});
