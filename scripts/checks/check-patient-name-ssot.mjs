#!/usr/bin/env node
// Patient display names must route through `getPatientFullName()` so missing
// parts, whitespace, and fallback behavior stay consistent across surfaces.

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import process from "node:process";

const ROOTS = ["apps/app", "apps/api"];
const files = execFileSync(
  "git",
  ["ls-files", "--cached", "--others", "--exclude-standard", "--", ...ROOTS],
  { encoding: "utf8" },
)
  .split("\n")
  .filter(Boolean)
  .filter((file) => /\.tsx?$/.test(file))
  .filter((file) => !/\.(spec|test)\.tsx?$/.test(file))
  .filter((file) => !/\/e2e\//.test(file));

const ALLOW_LINE = "allow-inline-patient-name";
const ALLOW_WINDOW = 3;
const rules = [
  {
    name: "template literal composition",
    pattern:
      /\$\{[^}\n]*\.firstName[^}\n]*\}[^`\n]*\$\{[^}\n]*\.lastName[^}\n]*\}/g,
  },
  {
    name: "JSX composition",
    pattern: /\{[^}\n]*\.firstName[^}\n]*\}\s*\{[^}\n]*\.lastName[^}\n]*\}/g,
  },
  {
    name: "array composition",
    pattern: /\[[^\]]{0,240}\.firstName\s*,[^\]]{0,240}\.lastName[^\]]*\]/gs,
  },
];
const findings = [];

for (const file of files) {
  let source;
  try {
    source = readFileSync(file, "utf8");
  } catch {
    continue;
  }

  const lines = source.split("\n");
  for (const rule of rules) {
    for (const match of source.matchAll(rule.pattern)) {
      const lineNumber = source.slice(0, match.index).split("\n").length;
      const start = Math.max(0, lineNumber - ALLOW_WINDOW - 1);
      const end = Math.min(lines.length, lineNumber + ALLOW_WINDOW);
      const allowed = lines
        .slice(start, end)
        .some((line) => line.includes(ALLOW_LINE));
      if (!allowed) {
        findings.push(`${file}:${lineNumber}: ${rule.name}`);
      }
    }
  }
}

if (findings.length === 0) {
  process.stdout.write("[patient-name-ssot] OK\n");
  process.exit(0);
}

process.stderr.write(
  `[patient-name-ssot] ${findings.length} inline patient-name composition(s):\n`,
);
for (const finding of findings.slice(0, 50)) {
  process.stderr.write(`  - ${finding}\n`);
}
if (findings.length > 50) {
  process.stderr.write(`  ... and ${findings.length - 50} more\n`);
}
process.stderr.write(
  "Use `getPatientFullName()` from `@workspace/utils`, or add `// allow-inline-patient-name: <reason>` for a deliberate non-display composition.\n",
);
process.exit(1);
