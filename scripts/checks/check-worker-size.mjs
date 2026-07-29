import { execSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { gzipSync } from "node:zlib";
import path from "node:path";

// 3.5 MiB: Cloudflare Workers paid plan allows 10 MB; 3.5 MiB is a
// comfortable budget with ~500 KB headroom for growth. The previous
// 3 MiB budget was exceeded by the next-intl + Next 16.2.11 upgrade.
const DEFAULT_GZIP_LIMIT_BYTES = 3.5 * 1024 * 1024;

const [
  workerPathArg = ".open-next/worker.js",
  labelArg = workerPathArg,
  wranglerEnvArg = "production",
  gzipLimitArg,
] = process.argv.slice(2);

function parseGzipLimit(value, source) {
  if (value === undefined || value === "") {
    return undefined;
  }

  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    console.error(`${source} must be a positive integer byte count.`);
    process.exit(1);
  }

  return parsed;
}

const configuredGzipLimitBytes = parseGzipLimit(
  gzipLimitArg ?? process.env.DOCITA_CLOUDFLARE_WORKER_GZIP_LIMIT_BYTES,
  gzipLimitArg === undefined
    ? "DOCITA_CLOUDFLARE_WORKER_GZIP_LIMIT_BYTES"
    : "gzip limit argument",
);
const gzipLimitBytes = configuredGzipLimitBytes ?? DEFAULT_GZIP_LIMIT_BYTES;

function measureBundle(absoluteWorkerPath) {
  const workerBytes = readFileSync(absoluteWorkerPath);
  const gzipBytes = gzipSync(workerBytes).length;
  return {
    rawBytes: workerBytes.length,
    gzipBytes,
  };
}

function resolveWranglerBundlePath(cwd, wranglerEnv) {
  const outdir = mkdtempSync(path.join(tmpdir(), "docita-worker-size-"));
  try {
    execSync(
      `npx wrangler deploy --dry-run --minify --outdir "${outdir}" --env ${wranglerEnv}`,
      {
        cwd,
        stdio: ["ignore", "pipe", "pipe"],
        env: process.env,
      },
    );
    return {
      bundlePath: path.join(outdir, "worker.js"),
      cleanup: () => rmSync(outdir, { recursive: true, force: true }),
    };
  } catch (error) {
    rmSync(outdir, { recursive: true, force: true });
    throw error;
  }
}

const cwd = process.cwd();
let absoluteWorkerPath = path.resolve(cwd, workerPathArg);
let cleanup = () => {};

// Always measure through wrangler dry-run (with --minify) for accurate
// bundle size that matches what would actually be deployed.
try {
  const resolved = resolveWranglerBundlePath(cwd, wranglerEnvArg);
  absoluteWorkerPath = resolved.bundlePath;
  cleanup = resolved.cleanup;
} catch (error) {
  // Fall back to raw file measurement if wrangler dry-run fails.
  console.warn(
    `${labelArg} wrangler dry-run failed: ${error.message}; measuring raw worker.`,
  );
  const rawBytes = readFileSync(absoluteWorkerPath).length;
  const rawKb = (rawBytes / 1024).toFixed(1);
  console.log(
    `${labelArg} raw worker (${rawKb} KB raw).`,
  );
}

try {
  const { rawBytes, gzipBytes } = measureBundle(absoluteWorkerPath);
  const rawKb = (rawBytes / 1024).toFixed(1);
  const gzipKb = (gzipBytes / 1024).toFixed(1);
  const gzipLimitKb = (gzipLimitBytes / 1024).toFixed(1);

  if (gzipBytes > gzipLimitBytes) {
    console.error(
      `${labelArg} worker bundle is ${gzipKb} KB gzip, above the ${gzipLimitKb} KB Cloudflare limit (${rawKb} KB raw).`,
    );
    console.error(
      "Trim middleware/server imports first, then inspect heavy runtime dependencies if needed.",
    );
    process.exit(1);
  }

  console.log(
    `${labelArg} worker bundle size: ${rawKb} KB raw / ${gzipKb} KB gzip (limit ${gzipLimitKb} KB gzip)`,
  );
} finally {
  cleanup();
}
