import { statSync } from "node:fs";
import path from "node:path";

const DEFAULT_LIMIT_BYTES = 3 * 1024 * 1024;

const [workerPathArg = ".open-next/worker.js", labelArg = workerPathArg] =
  process.argv.slice(2);

const absoluteWorkerPath = path.resolve(process.cwd(), workerPathArg);
const workerStats = statSync(absoluteWorkerPath);
const workerSizeBytes = workerStats.size;
const workerSizeKb = (workerSizeBytes / 1024).toFixed(1);
const sizeLimitKb = (DEFAULT_LIMIT_BYTES / 1024).toFixed(1);

if (workerSizeBytes > DEFAULT_LIMIT_BYTES) {
  console.error(
    `${labelArg} worker bundle is ${workerSizeKb} KB, above the ${sizeLimitKb} KB Cloudflare limit.`,
  );
  console.error(
    "Trim instrumentation first, then inspect server imports and split heavy runtime code if needed.",
  );
  process.exit(1);
}

console.log(
  `${labelArg} worker bundle size: ${workerSizeKb} KB / ${sizeLimitKb} KB limit`,
);
