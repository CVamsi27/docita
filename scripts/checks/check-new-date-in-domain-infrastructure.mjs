#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import process from "node:process";

// Bare `new Date()` is forbidden in domain code so tests can fake time
// deterministically via `IClock`. Presentation (controllers, DTOs) still
// allows `new Date()` for ad-hoc serialization but should prefer
// `clock.now()` when available.
// Use `// allow-new-date: <reason>` on the same line to opt out for
// legitimate cases (e.g., parsing a literal timestamp).
// SYSTEM_DESIGN_AND_PATTERNS.md §28.2 item 18.

const files = execFileSync(
  "git",
  [
    "ls-files",
    "--cached",
    "--others",
    "--exclude-standard",
    "--",
    "apps/api/src/domains",
  ],
  { encoding: "utf8" },
)
  .split("\n")
  .filter(Boolean)
  .filter((file) => /\.ts$/.test(file))
  .filter((file) => !/\.(spec|test)\.[tj]sx?$/.test(file))
  .filter((file) => !/\/presentation\//.test(file))
  .filter((file) => existsSync(file));

const bareNewDatePattern = /\bnew Date\s*\(\s*\)/g;
const ALLOW_LINE = "allow-new-date";
const findings = [];

for (const file of files) {
  const source = readFileSync(file, "utf8");
  const lines = source.split(/\r?\n/);
  for (const match of source.matchAll(bareNewDatePattern)) {
    const lineNo = source.slice(0, match.index).split(/\r?\n/).length;
    const lineText = lines[lineNo - 1] ?? "";
    if (lineText.includes(ALLOW_LINE)) continue;
    findings.push(`${file}:${lineNo}`);
  }
}

if (findings.length > 0) {
  process.stderr.write(
    "Bare new Date() is forbidden in non-presentation domain code. Inject IClock and pass clock.now(), or parse an explicit timestamp with new Date(value). Add `// allow-new-date: <reason>` on the line for justified exceptions.\n\n",
  );
  for (const finding of findings) {
    process.stderr.write(`- ${finding}\n`);
  }
  process.exit(1);
}

process.stdout.write(
  "Non-presentation domain bare new Date() check passed.\n",
);
