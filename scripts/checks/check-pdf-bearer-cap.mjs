#!/usr/bin/env node
// Verifies that PDF signed-URL handlers and the controllers that return
// them never expose a bearer-bound URL outside its session context.
//
// SYSTEM_DESIGN_AND_PATTERNS.md §28.1 item 3.
//
// This is a heuristic check: flag controller responses that include a
// `signedUrl` field but do not also set `tokenAudience` or pass the
// requester identity through the signing helper.

import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import process from "node:process";

const ROOT = "apps/api/src/domains";
const files = execSync(`git ls-files '${ROOT}'`, { encoding: "utf8" })
  .split("\n")
  .filter(Boolean)
  .filter((f) => /\.controller\.ts$/.test(f));

const advisories = [];

for (const file of files) {
  let source;
  try {
    source = readFileSync(file, "utf8");
  } catch {
    continue;
  }
  // Find lines that return a `signedUrl` to the client.
  const exposes = /signedUrl|presignedUrl|downloadUrl/.test(source);
  if (!exposes) continue;
  const bindsAudience =
    /tokenAudience|bindToRequester|withRequesterContext|userId\b/.test(source);
  if (!bindsAudience) {
    advisories.push(
      `${file}: returns a signed URL but no obvious requester-audience binding`,
    );
  }
}

if (advisories.length === 0) {
  process.stdout.write("[pdf-bearer-cap] OK\n");
  process.exit(0);
}

process.stderr.write(
  `[pdf-bearer-cap] ${advisories.length} advisory finding(s):\n`,
);
for (const finding of advisories) {
  process.stderr.write(`  - ${finding}\n`);
}
process.stderr.write(
  "Pass `requesterId` (or session id) into the signed-URL helper so a stolen URL cannot be replayed by a different session. See SYSTEM_DESIGN_AND_PATTERNS.md §28.1 item 3.\n",
);
process.exit(0); // advisory
