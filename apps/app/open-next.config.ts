import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import r2IncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache";

// Prevent prefetch-hints manifest errors in Cloudflare Workers
const disablePrefetchHints = {
  wrapper({ handler }) {
    return async (request, context) => {
      try {
        return await handler(request, context);
      } catch (error) {
        if (
          error?.message?.includes('Unexpected loadManifest') &&
          error?.message?.includes('prefetch-hints')
        ) {
          console.warn('[OpenNext] Prefetch hints unavailable in Worker environment (expected)');
          return new Response('Service unavailable', { status: 503 });
        }
        throw error;
      }
    };
  },
};

const config = defineCloudflareConfig({
  incrementalCache: r2IncrementalCache,
  override: disablePrefetchHints,
});

export default config;
