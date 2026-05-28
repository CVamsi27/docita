#!/usr/bin/env node
// Advisory check: every `*FormSchema` in packages/types/src/forms/ should
// extend or pick from a corresponding base `*Schema` in
// packages/types/src/<domain>/. Pure-UI form schemas with no API analogue
// are allowed; flag obvious drift candidates.
//
// SYSTEM_DESIGN_AND_PATTERNS.md §56 item 48.

import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import process from "node:process";

const ROOT = "packages/types/src/forms";
const FORM_SCHEMA_RE = /export\s+const\s+([A-Za-z0-9_]+FormSchema)\s*=/g;
const EXTENDS_BASE_RE = /(?:\.extend|\.pick|\.omit|\.partial|extends|=\s*)[A-Za-z0-9_]+Schema\b/;

const files = execSync(`git ls-files '${ROOT}'`, { encoding: "utf8" })
  .split("\n")
  .filter(Boolean)
  .filter((f) => /\.ts$/.test(f))
  .filter((f) => !/\.(spec|test)\.ts$/.test(f));

const advisories = [];

for (const file of files) {
  let source;
  try {
    source = readFileSync(file, "utf8");
  } catch {
    continue;
  }
  for (const match of source.matchAll(FORM_SCHEMA_RE)) {
    const name = match[1];
    const after = source.slice(match.index);
    const declarationBody = after.slice(0, 400);
    if (!EXTENDS_BASE_RE.test(declarationBody)) {
      advisories.push(`${file}: ${name} does not appear to derive from a *Schema base`);
    }
  }
}

if (advisories.length === 0) {
  process.stdout.write("[form-schema-extends] OK\n");
  process.exit(0);
}

process.stderr.write(
  `[form-schema-extends] ${advisories.length} advisory finding(s):\n`,
);
for (const finding of advisories) {
  process.stderr.write(`  - ${finding}\n`);
}
process.stderr.write(
  "If the form schema is purely UI-only (no API analogue), add `// allow-no-base-schema: <reason>` near the declaration. Otherwise, derive from packages/types/src/<domain>/ via .extend / .pick / .omit.\n",
);
process.exit(0); // advisory — does not fail CI
