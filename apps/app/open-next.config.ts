import { defineCloudflareConfig } from "@opennextjs/cloudflare";

const config = defineCloudflareConfig({});

config.default.minify = true;
config.default.runtime = "edge";

export default config;
