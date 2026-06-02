#!/usr/bin/env node

import { readFileSync } from "node:fs";
import process from "node:process";

function extractQuotedValues(source, pattern, path) {
  const match = source.match(pattern);
  if (!match) {
    throw new Error(`Could not parse field registry in ${path}`);
  }
  return [...match[1].matchAll(/["']([^"']+)["']/g)].map((item) =>
    item[1].toLowerCase(),
  );
}

const encryptionPath =
  "apps/api/src/shared/common/encryption-patient-fields.boundary.ts";
const apiRedactorPath =
  "apps/api/src/shared/modules/observability/phi-redactor.ts";
const sharedScrubberPath = "packages/utils/src/monitoring/phi-scrubber.ts";

const encrypted = extractQuotedValues(
  readFileSync(encryptionPath, "utf8"),
  /const fields = \[([\s\S]*?)\] as const/,
  encryptionPath,
);
const apiRedacted = new Set(
  extractQuotedValues(
    readFileSync(apiRedactorPath, "utf8"),
    /PHI_FIELD_NAMES[^=]*=\s*new Set\(\[([\s\S]*?)\]\)/,
    apiRedactorPath,
  ),
);
const sharedRedacted = new Set(
  extractQuotedValues(
    readFileSync(sharedScrubberPath, "utf8"),
    /PHI_FIELDS[^=]*=\s*new Set\(\[([\s\S]*?)\]\)/,
    sharedScrubberPath,
  ),
);

const findings = [];
for (const field of encrypted) {
  if (!apiRedacted.has(field)) {
    findings.push(`${apiRedactorPath}: missing encrypted patient field ${field}`);
  }
  if (!sharedRedacted.has(field)) {
    findings.push(`${sharedScrubberPath}: missing encrypted patient field ${field}`);
  }
}

if (findings.length > 0) {
  process.stderr.write("PHI boundary parity check failed.\n");
  for (const finding of findings) {
    process.stderr.write(`- ${finding}\n`);
  }
  process.exit(1);
}

process.stdout.write(
  `PHI boundary parity check passed (${encrypted.length} encrypted patient fields).\n`,
);
