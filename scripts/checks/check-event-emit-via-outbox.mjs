#!/usr/bin/env node
// Advisory: command-path code in `apps/api/src/domains/<domain>/application/`
// should call `outbox.append(tx, ...)` instead of `eventEmitter.emit(...)`
// directly. Read-side telemetry and listeners themselves are exempt.
//
// SYSTEM_DESIGN_AND_PATTERNS.md §28.2 items 11, 12, and §28.4 item 31.
// See ADR docs/architecture/decisions/0010-transactional-outbox.md.

import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import process from "node:process";

const ROOT = "apps/api/src/domains";
const files = execSync(`git ls-files '${ROOT}'`, { encoding: "utf8" })
  .split("\n")
  .filter(Boolean)
  .filter((f) => /\/application\//.test(f))
  .filter((f) => /\.ts$/.test(f))
  .filter((f) => !/\.(spec|test)\.ts$/.test(f))
  .filter((f) => !/listener|consumer|event\.listener/i.test(f));

const EMIT_RE = /\b(?:eventEmitter|events|this\.events?|eventBus)\.emit\s*\(/;
const ALLOW_LINE = "allow-direct-emit";
const advisories = [];

for (const file of files) {
  let source;
  try {
    source = readFileSync(file, "utf8");
  } catch {
    continue;
  }
  const lines = source.split("\n");
  lines.forEach((line, idx) => {
    if (line.includes(ALLOW_LINE)) return;
    if (EMIT_RE.test(line)) {
      advisories.push(`${file}:${idx + 1}: ${line.trim()}`);
    }
  });
}

if (advisories.length === 0) {
  process.stdout.write("[event-emit-via-outbox] OK\n");
  process.exit(0);
}

process.stderr.write(
  `[event-emit-via-outbox] ${advisories.length} direct .emit(...) call(s) in command paths:\n`,
);
for (const finding of advisories.slice(0, 50)) {
  process.stderr.write(`  - ${finding}\n`);
}
if (advisories.length > 50) {
  process.stderr.write(`  ... and ${advisories.length - 50} more\n`);
}
process.stderr.write(
  "Migrate to `outbox.append(tx, ...)` (inject IOutboxService) or add `// allow-direct-emit: <reason>` for cases that genuinely require fire-and-forget emit.\n",
);
// Advisory until command-path migration completes.
process.exit(0);
