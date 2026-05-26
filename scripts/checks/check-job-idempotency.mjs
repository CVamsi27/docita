#!/usr/bin/env node

import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const repoRoot = process.cwd();
const enforce = process.argv.includes("--enforce");
const roots = ["apps/worker/src", "apps/api/src"].filter((root) =>
  fs.existsSync(path.join(repoRoot, root)),
);

const files = roots.flatMap((root) =>
  execSync(`git ls-files ${root}`, { cwd: repoRoot, encoding: "utf8" })
    .split("\n")
    .filter(Boolean)
    .filter((file) => /processor\.ts$|queue\.module\.ts$/.test(file)),
);

const findings = [];

for (const file of files) {
  const source = fs.readFileSync(path.join(repoRoot, file), "utf8");
  const queueLike = /\b(Processor|WorkerHost|BullModule|Queue)\b/.test(source);
  if (!queueLike) continue;

  const hasRetry = /\battempts\b/.test(source) && /\bbackoff\b/.test(source);
  const hasLockDuration = /\blockDuration\b/.test(source);
  const hasIdempotency = /\b(idempotenc|dedupe|job\.id|jobId)\b/i.test(source);
  const hasDlq = /\b(DLQ|dead.?letter|removeOnFail|failed)\b/i.test(source);

  if (!hasRetry || !hasLockDuration || !hasIdempotency || !hasDlq) {
    findings.push({
      file,
      reason: [
        !hasRetry ? "retry/backoff" : null,
        !hasLockDuration ? "lockDuration" : null,
        !hasIdempotency ? "idempotency marker" : null,
        !hasDlq ? "DLQ/failure policy" : null,
      ]
        .filter(Boolean)
        .join(", "),
    });
  }
}

if (findings.length > 0) {
  console.error(
    enforce ? "Job idempotency check failed.\n" : "Job idempotency report:\n",
  );
  for (const finding of findings) {
    console.error(`- ${finding.file}: missing ${finding.reason}`);
  }
  if (enforce) process.exit(1);
  console.log(
    `Job idempotency reported ${findings.length} finding(s). Use --enforce to fail.`,
  );
  process.exit(0);
}

console.log("Job idempotency check passed.");
