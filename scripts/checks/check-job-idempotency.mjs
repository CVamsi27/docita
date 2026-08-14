#!/usr/bin/env node

import fs from "node:fs";
import {
  gitLsSourceFiles,
  reportFindingsAndExit,
} from "../lib/check-runner.mjs";

const files = gitLsSourceFiles(["apps/worker/src", "apps/api/src"], {
  include: [/processor\.ts$|queue\.module\.ts$/],
});

const findings = [];

for (const file of files) {
  if (!fs.existsSync(file)) continue;
  const source = fs.readFileSync(file, "utf8");
  const queueLike = /\b(Processor|WorkerHost|BullModule|Queue)\b/.test(source);
  if (!queueLike) continue;

  const hasRetry = /\battempts\b/.test(source) && /\bbackoff\b/.test(source);
  const hasLockDuration = /\blockDuration\b/.test(source);
  const hasIdempotency = /\b(idempotenc|dedupe|job\.id|jobId)\b/i.test(source);
  const hasDlq = /\b(DLQ|dead.?letter|removeOnFail|failed)\b/i.test(source);

  if (!hasRetry || !hasLockDuration || !hasIdempotency || !hasDlq) {
    const reason = [
      !hasRetry ? "retry/backoff" : null,
      !hasLockDuration ? "lockDuration" : null,
      !hasIdempotency ? "idempotency marker" : null,
      !hasDlq ? "DLQ/failure policy" : null,
    ]
      .filter(Boolean)
      .join(", ");
    findings.push(`${file}: missing ${reason}`);
  }
}

reportFindingsAndExit("Job idempotency check", findings);
