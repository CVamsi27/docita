import { createCloudflareApiProxy } from "@workspace/utils/http/cloudflare-api-proxy";

const app = createCloudflareApiProxy({
  backend: process.env.API_PROXY_TARGET || "https://api.docita.work",
});

export default app;
