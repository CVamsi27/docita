import { defineConfig } from "astro/config";
import cloudflare from "@astrojs/cloudflare";
import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";
import process from "node:process";
import { fileURLToPath, URL } from "node:url";

const isCloudflareBuild =
  process.env.NODE_ENV === "production" || process.env.DOCITA_CLOUDFLARE === "1";

export default defineConfig({
  site: "https://docita.work",
  // No server sessions: skip default SESSION KV (deploy fails if namespace already exists).
  session: {
    driver: {
      entrypoint: "unstorage/drivers/null",
    },
  },
  output: "server",
  build: {
    inlineStylesheets: "always",
  },
  integrations: [react()],
  vite: {
    plugins: [tailwindcss()],

    resolve: {
      dedupe: ["react", "react-dom"],
      alias: {
        "@": fileURLToPath(new URL("./src", import.meta.url)),
      },
    },
    optimizeDeps: {
      include: ["react", "react-dom", "react-dom/client"],
    },
  },
  ...(isCloudflareBuild
    ? {
        adapter: cloudflare({
          imageService: "compile",
          inspectorPort: false,
          prerenderEnvironment: "node",
        }),
        vite: {
          ssr: {
            noExternal: true,
          },
          plugins: [tailwindcss()],
          resolve: {
            dedupe: ["react", "react-dom"],
            alias: {
              "@": fileURLToPath(new URL("./src", import.meta.url)),
            },
          },
        },
      }
    : {}),
});
