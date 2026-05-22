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
  },
  ...(isCloudflareBuild
    ? {
        adapter: cloudflare({
          imageService: "compile",
          inspectorPort: false,
          prerenderEnvironment: "node",
        }),
        // Marketing site does not use Astro sessions; avoid Wrangler auto-provisioning
        // a duplicate "docita-landing-session" KV namespace on deploy.
        session: {
          driver: {
            entrypoint: "unstorage/drivers/null",
          },
        },
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
