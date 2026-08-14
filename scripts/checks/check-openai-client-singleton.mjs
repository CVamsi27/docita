#!/usr/bin/env node
/**
 * OpenAI client singleton guard (DPDP kill-switch integrity).
 *
 * The DPDP master kill-switch lives in OpenaiService: the OpenAI client is
 * constructed ONLY when AI_EXTERNAL_ENABLED=true AND an API key is present
 * (apps/api/src/shared/modules/ai/openai.service.ts). The deleted ai-core
 * module constructed OpenAI/LLM clients OUTSIDE that file, silently
 * bypassing the kill-switch — patient data could reach OpenAI even with the
 * switch off.
 *
 * Invariant enforced here: the OpenAI client may be constructed in exactly
 * one file, and the `openai` package may only be value-imported there.
 * Any `new OpenAI(` or value import of `openai` (or `require('openai')`)
 * anywhere else in apps/api or apps/worker fails the gate — spec files
 * included (a test that constructs a real client would also bypass the
 * switch whenever a key is present in the test environment).
 */

import fs from "node:fs";
import {
  gitLsSourceFiles,
  reportFindingsAndExit,
} from "../lib/check-runner.mjs";

// The one file allowed to construct the client and value-import the package.
const ALLOWED_OPENAI_FILE = "apps/api/src/shared/modules/ai/openai.service.ts";
const ALLOWED_OPENAI_FILES = new Set([ALLOWED_OPENAI_FILE]);

const SCAN_ROOTS = ["apps/api/src", "apps/worker/src"];

const findings = [];
const files = gitLsSourceFiles(SCAN_ROOTS, { extensions: [".ts", ".tsx"] });

const NEW_OPENAI_RE = /new\s+OpenAI\s*\(/;
// `from 'openai'` (single or double quotes) on a value-import line.
const OPENAI_FROM_IMPORT_RE = /from\s*['"]openai['"]/;
const OPENAI_REQUIRE_RE = /require\s*\(\s*['"]openai['"]\s*\)/;
// Line comments (`//`) and doc-block continuation lines (`*`) cannot construct
// a client. A line that merely STARTS with `/*` may still hold code after the
// comment (`/* note */ new OpenAI(...)`) — a real bypass vector — so it is
// scanned like any other line.
const COMMENT_ONLY_LINE_RE = /^\s*(?:\/\/|\*)/;

for (const file of files) {
  if (ALLOWED_OPENAI_FILES.has(file)) continue; // the singleton site
  const source = fs.readFileSync(file, "utf8");
  const lines = source.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (COMMENT_ONLY_LINE_RE.test(line)) continue;
    if (NEW_OPENAI_RE.test(line)) {
      findings.push(
        `[openai-client-singleton] ${file}:${i + 1} constructs the OpenAI client ('new OpenAI(') outside ${ALLOWED_OPENAI_FILE} — route every AI call through OpenaiService so the AI_EXTERNAL_ENABLED kill-switch cannot be bypassed`,
      );
    }
    if (
      (OPENAI_FROM_IMPORT_RE.test(line) || OPENAI_REQUIRE_RE.test(line)) &&
      !/^\s*import\s+type\b/.test(line)
    ) {
      findings.push(
        `[openai-client-singleton] ${file}:${i + 1} value-imports the 'openai' package outside ${ALLOWED_OPENAI_FILE} — the client may only be constructed there; consume OpenAI through OpenaiService instead`,
      );
    }
  }
}

reportFindingsAndExit("OpenAI client singleton check", findings, {
  failAlways: true,
  extraMessage:
    "The OpenAI client must only ever be constructed inside apps/api/src/shared/modules/ai/openai.service.ts, where the AI_EXTERNAL_ENABLED kill-switch gates construction. Move any new client construction (or package value-import) behind OpenaiService.",
});
