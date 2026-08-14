#!/usr/bin/env node
// Verifies that PDF signed-URL handlers and the controllers that return
// them never expose a bearer-bound URL outside its session context.

import { readFileSync } from "node:fs";
import {
  gitLsSourceFiles,
  reportFindingsAndExit,
} from "../lib/check-runner.mjs";

const files = gitLsSourceFiles(["apps/api/src/domains"], {
  include: [/\.controller\.ts$/],
});

const advisories = [];

for (const file of files) {
  let source;
  try {
    source = readFileSync(file, "utf8");
  } catch {
    continue;
  }
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

reportFindingsAndExit("pdf-bearer-cap", advisories, {
  advisory: true,
  extraMessage:
    "Pass `requesterId` (or session id) into the signed-URL helper so a stolen URL cannot be replayed by a different session.",
});
