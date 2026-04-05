import { defineConfig } from "astro/config";
import cloudflare from "@astrojs/cloudflare";
import react from "@astrojs/react";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  site: "https://docita.work",
  output: "server",
  adapter: cloudflare({ imageService: "compile" }),
  integrations: [react()],
  vite: {
    resolve: {
      alias: {
        "@": fileURLToPath(new URL("./src", import.meta.url)),
      },
    },
  },
});
