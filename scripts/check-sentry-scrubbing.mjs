#!/usr/bin/env node

import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const repoRoot = process.cwd();
const enforce = process.argv.includes("--enforce");
const piiFields = [
  "phoneNumber",
  "email",
  "firstName",
  "lastName",
  "address",
  "mfaSecret",
  "mfaBackupCodes",
  "Authorization",
  "Cookie",
];

const files = execSync("git ls-files apps packages", {
  cwd: repoRoot,
  encoding: "utf8",
})
  .split("\n")
  .filter(Boolean)
  .filter((file) => /sentry|client-error-reporting|error-handling/i.test(file))
  .filter((file) => /\.(ts|tsx)$/.test(file));

const sourceByFile = new Map(
  files.map((file) => [
    file,
    fs.readFileSync(path.join(repoRoot, file), "utf8"),
  ]),
);
const combined = Array.from(sourceByFile.values()).join("\n");
const missing = piiFields.filter((field) => !combined.includes(field));
const hasBeforeSendOrScrubber = /\b(beforeSend|sanitize|scrub|redact)\b/i.test(
  combined,
);

if (missing.length > 0 || !hasBeforeSendOrScrubber) {
  console.error(
    enforce ? "Sentry scrubbing check failed.\n" : "Sentry scrubbing report:\n",
  );
  if (!hasBeforeSendOrScrubber) {
    console.error(
      "- No Sentry beforeSend/sanitize/scrub/redact path was detected.",
    );
  }
  for (const field of missing) {
    console.error(`- Missing scrub field reference: ${field}`);
  }
  if (enforce) process.exit(1);
  console.log(
    "Sentry scrubbing check is report-only until all configs share the scrubber.",
  );
  process.exit(0);
}

console.log("Sentry scrubbing check passed.");
