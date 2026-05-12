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
  adapter: cloudflare({
    imageService: "compile",
    inspectorPort: false,
    prerenderEnvironment: "node",
  }),
  integrations: [react()],
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
});
