import { execSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { gzipSync } from "node:zlib";
import path from "node:path";

/** Cloudflare Workers Free: 3 MiB gzip; Paid: 10 MiB gzip. */
const DEFAULT_GZIP_LIMIT_BYTES = 3 * 1024 * 1024;
/** OpenNext emits a tiny worker bootstrap; the wrangler bundle is the real limit. */
const OPENNEXT_BOOTSTRAP_MAX_BYTES = 100 * 1024;

const [
  workerPathArg = ".open-next/worker.js",
  labelArg = workerPathArg,
  wranglerEnvArg = "production",
] = process.argv.slice(2);

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
      `npx wrangler deploy --dry-run --outdir "${outdir}" --env ${wranglerEnv}`,
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

const bootstrap = measureBundle(absoluteWorkerPath);
if (bootstrap.rawBytes <= OPENNEXT_BOOTSTRAP_MAX_BYTES) {
  const resolved = resolveWranglerBundlePath(cwd, wranglerEnvArg);
  absoluteWorkerPath = resolved.bundlePath;
  cleanup = resolved.cleanup;
}

try {
  const { rawBytes, gzipBytes } = measureBundle(absoluteWorkerPath);
  const rawKb = (rawBytes / 1024).toFixed(1);
  const gzipKb = (gzipBytes / 1024).toFixed(1);
  const gzipLimitKb = (DEFAULT_GZIP_LIMIT_BYTES / 1024).toFixed(1);

  if (gzipBytes > DEFAULT_GZIP_LIMIT_BYTES) {
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
