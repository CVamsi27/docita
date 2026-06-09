#!/usr/bin/env node
// Advisory check: every `*FormSchema` in packages/types/src/forms/ should
// extend or pick from a corresponding base `*Schema` in
// packages/types/src/<domain>/. Pure-UI form schemas with no API analogue
// are allowed; flag obvious drift candidates.

import { readFileSync } from "node:fs";
import {
  gitLsSourceFiles,
  reportFindingsAndExit,
} from "../lib/check-runner.mjs";

const FORM_SCHEMA_RE = /export\s+const\s+([A-Za-z0-9_]+FormSchema)\s*=/g;
const EXTENDS_BASE_RE =
  /(?:\.extend|\.pick|\.omit|\.partial|extends|=\s*)[A-Za-z0-9_]+Schema\b/;

const files = gitLsSourceFiles(["packages/types/src/forms"], {
  extensions: [".ts"],
  exclude: [/\.(spec|test)\.ts$/],
});

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
      advisories.push(
        `${file}: ${name} does not appear to derive from a *Schema base`,
      );
    }
  }
}

reportFindingsAndExit("form-schema-extends", advisories, {
  advisory: true,
  extraMessage:
    "If the form schema is purely UI-only (no API analogue), add `// allow-no-base-schema: <reason>` near the declaration. Otherwise, derive from packages/types/src/<domain>/ via .extend / .pick / .omit.",
});
