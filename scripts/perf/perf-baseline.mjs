import fs from "node:fs/promises";
import path from "node:path";
import {
  collectAppRouteBundleSizes,
  formatBytes,
} from "../lib/perf-metrics.mjs";

async function fetchJson(url, token) {
  try {
    const response = await fetch(url, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
    if (!response.ok) {
      return {
        error: `Request failed with status ${response.status} for ${url}`,
      };
    }
    return await response.json();
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Failed to fetch metrics endpoint",
    };
  }
}

async function main() {
  const repoRoot = process.cwd();
  const appDir = path.join(repoRoot, "apps/app-vite");
  const outputDir = path.join(repoRoot, "logs/performance");
  const outputPath = path.join(outputDir, "baseline.json");
  const apiBaseUrl = process.env["PERF_API_BASE_URL"];
  const apiToken = process.env["PERF_API_TOKEN"];

  const bundleMetrics = await collectAppRouteBundleSizes(appDir);

  const apiMetrics = apiBaseUrl
    ? {
        requests: await fetchJson(`${apiBaseUrl}/api/monitoring/requests`, apiToken),
        performance: await fetchJson(
          `${apiBaseUrl}/api/monitoring/performance`,
          apiToken,
        ),
      }
    : { skipped: "PERF_API_BASE_URL is not set" };

  const payload = {
    capturedAt: new Date().toISOString(),
    appBundleMetrics: bundleMetrics,
    apiMetrics,
  };

  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");

  process.stdout.write(`Saved performance baseline to ${outputPath}\n`);
  process.stdout.write("Tracked route bundle sizes:\n");
  for (const [route, bytes] of Object.entries(bundleMetrics.routeSizes)) {
    process.stdout.write(`- ${route}: ${formatBytes(bytes)}\n`);
  }

  if (bundleMetrics.unclassifiedChunks?.length) {
    const shown = bundleMetrics.unclassifiedChunks.slice(0, 15);
    process.stdout.write(
      `\nWarning: ${bundleMetrics.unclassifiedChunks.length} route chunk(s) matched no pattern — ` +
        "update SHARED_CHUNK_PATTERNS / TRACKED_ROUTES in scripts/lib/perf-metrics.mjs " +
        "or the classification will silently drift (first 15 shown):\n",
    );
    for (const file of shown) {
      process.stdout.write(`- ${file}\n`);
    }
    if (bundleMetrics.unclassifiedChunks.length > shown.length) {
      process.stdout.write(
        `- … and ${bundleMetrics.unclassifiedChunks.length - shown.length} more\n`,
      );
    }
  }
}

main().catch((error) => {
  process.stderr.write(
    `${error instanceof Error ? error.message : "Unexpected error"}\n`,
  );
  process.exit(1);
});
