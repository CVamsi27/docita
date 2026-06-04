import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import r2IncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache";

const config = defineCloudflareConfig(
  process.env.DOCITA_ENV === "production"
    ? { incrementalCache: r2IncrementalCache }
    : {}
);

if (config.middleware?.external) {
  config.middleware.runtime = "edge";
}

export default config;
