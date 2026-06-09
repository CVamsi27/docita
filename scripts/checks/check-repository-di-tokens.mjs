#!/usr/bin/env node
// Verifies that every Prisma*Repository class is injected via a string
// token (e.g., `@Inject('IXRepository')`) rather than a concrete-class
// constructor parameter type.

import { readFileSync } from "node:fs";
import {
  gitLsSourceFiles,
  reportFindingsAndExit,
} from "../lib/check-runner.mjs";

const files = gitLsSourceFiles(["apps/api/src/domains"], {
  include: [/\.module\.ts$/],
});

const advisories = [];

for (const file of files) {
  let source;
  try {
    source = readFileSync(file, "utf8");
  } catch {
    continue;
  }
  const repoClassMatches = [
    ...source.matchAll(/Prisma[A-Z][A-Za-z]*Repository/g),
  ];
  if (repoClassMatches.length === 0) continue;
  const hasTokenizedProvider =
    /provide:\s*['"]I[A-Z][A-Za-z]*Repository['"]/.test(source);
  if (!hasTokenizedProvider) {
    advisories.push(
      `${file}: declares Prisma*Repository but no string-token provider (\`provide: 'I*Repository'\`)`,
    );
  }
}

reportFindingsAndExit("repository-di-tokens", advisories, {
  advisory: true,
  extraMessage:
    "Add a provider like `{ provide: 'IXRepository', useClass: PrismaXRepository }` so consumers can `@Inject('IXRepository')` instead of binding to the concrete class.",
});
