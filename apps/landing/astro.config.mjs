import { defineConfig } from "astro/config";
import cloudflare from "@astrojs/cloudflare";
import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  site: "https://docita.work",
  output: "server",
  build: {
    inlineStylesheets: "always",
  },
  session: {
    driver: "cloudflare-kv-binding",
    options: {
      binding: "SESSION",
    },
  },
  adapter: cloudflare({ imageService: "compile" }),
  integrations: [react()],
  vite: {
    plugins: [tailwindcss()],
    resolve: {
      alias: {
        "@": fileURLToPath(new URL("./src", import.meta.url)),
      },
    },
  },
});
