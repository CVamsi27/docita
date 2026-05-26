#!/usr/bin/env node
// Enforces use of the typed `queryKeys` factory from
// `packages/data-access/src/lib/query-keys.ts` in:
//   - packages/data-access/src/hooks/
//   - packages/data-access/src/internal/hooks/
//
// Raw inline arrays in `queryKey: [...]` or `useQuery({ queryKey: [...] })`
// outside the factory split the cache silently (typo, drift). The factory
// is the single place where keys are typed; this check makes it the only
// place where keys are *defined*.
//
// SYSTEM_DESIGN_AND_PATTERNS.md §28.2 item 13; §56 item 47.

import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import process from "node:process";

const ROOTS = [
  "packages/data-access/src/hooks",
  "packages/data-access/src/internal/hooks",
];

const KEY_FILES = new Set([
  "packages/data-access/src/lib/query-keys.ts",
]);

const files = ROOTS.flatMap((root) =>
  execSync(`git ls-files '${root}'`, { encoding: "utf8" })
    .split("\n")
    .filter(Boolean),
)
  .filter((f) => /\.(ts|tsx)$/.test(f))
  .filter((f) => !/\.(spec|test)\.[tj]sx?$/.test(f))
  .filter((f) => !KEY_FILES.has(f));

const VIOLATION = /queryKey\s*:\s*\[\s*['"`]/;
const ALLOW_LINE = "allow-raw-query-key";
const findings = [];

for (const file of files) {
  const source = readFileSync(file, "utf8");
  const lines = source.split("\n");
  lines.forEach((line, idx) => {
    if (line.includes(ALLOW_LINE)) return;
    if (VIOLATION.test(line)) {
      findings.push(`${file}:${idx + 1}: ${line.trim()}`);
    }
  });
}

if (findings.length === 0) {
  process.stdout.write("[query-key-factory] OK\n");
  process.exit(0);
}

process.stderr.write(
  `[query-key-factory] ${findings.length} raw queryKey literal(s) outside the typed factory:\n`,
);
for (const finding of findings) {
  process.stderr.write(`  - ${finding}\n`);
}
process.stderr.write(
  "Move the key into packages/data-access/src/lib/query-keys.ts as a typed entry, or add `// allow-raw-query-key: <reason>` on the same line for justified exceptions.\n",
);
process.exit(1);
