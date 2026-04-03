#!/usr/bin/env node

/**
 * Patches open-next.config.ts files to handle prefetch-hints manifest errors
 * in Cloudflare Workers.
 *
 * Issue: Next.js calls loadManifest('/.next/server/prefetch-hints.json') during
 * server initialization, but Cloudflare Workers cannot access filesystem manifests.
 *
 * This script is run before opennextjs-cloudflare build via build:*:cloudflare scripts.
 * It modifies open-next.config.ts at build time only — the patched files are not
 * committed to git.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

const appsToProcess = ['landing', 'app', 'admin'];

const prefetchHintsPatch = `
// Applied by ensure-opennext-prefetch-manifest-patch.mjs at build time
const disablePrefetchHints = {
  wrapper(handler) {
    return async (request, context) => {
      try {
        return await handler(request, context);
      } catch (error) {
        if (
          error?.message?.includes('Unexpected loadManifest') &&
          error?.message?.includes('prefetch-hints')
        ) {
          return new Response('Service unavailable', { status: 503 });
        }
        throw error;
      }
    };
  },
};`;

for (const app of appsToProcess) {
  const configPath = path.join(rootDir, 'apps', app, 'open-next.config.ts');

  if (!fs.existsSync(configPath)) {
    process.stdout.write(`Skipping ${app}: config not found\n`);
    continue;
  }

  let content = fs.readFileSync(configPath, 'utf-8');

  if (content.includes('disablePrefetchHints')) {
    process.stdout.write(`${app}: already patched\n`);
    continue;
  }

  process.stdout.write(`Patching ${app}/open-next.config.ts\n`);

  content = content.replace(
    'import r2IncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache";',
    `import r2IncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache";
${prefetchHintsPatch}`
  );

  content = content.replace(
    /const config = defineCloudflareConfig\(\{\s*incrementalCache:\s*r2IncrementalCache,\s*\}\);/,
    `const config = defineCloudflareConfig({
  incrementalCache: r2IncrementalCache,
  override: disablePrefetchHints,
});`
  );

  fs.writeFileSync(configPath, content, 'utf-8');
  process.stdout.write(`${app}: patched\n`);
}

process.stdout.write('Prefetch hints patch complete\n');
