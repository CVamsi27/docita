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
const REPOSITORY_CLASS_RE = /\bPrisma[A-Z][A-Za-z]*Repository\b/g;
const TOKEN_PROVIDER_RE =
  /\{[^{}]*\bprovide\s*:\s*([^,\n}]+)[^{}]*\b(?:useClass|useExisting)\s*:\s*(Prisma[A-Z][A-Za-z]*Repository)\b[^{}]*\}/gs;
const CONCRETE_PROVIDER_RE =
  /\{[^{}]*\bprovide\s*:\s*(Prisma[A-Z][A-Za-z]*Repository)\b[^{}]*\b(?:useClass|useExisting)\s*:\s*\1\b[^{}]*\}/s;

for (const file of files) {
  let source;
  try {
    source = readFileSync(file, "utf8");
  } catch {
    continue;
  }
  const repoClasses = new Set(
    [...source.matchAll(REPOSITORY_CLASS_RE)].map((match) => match[0]),
  );
  if (repoClasses.size === 0) continue;

  const tokenizedRepoClasses = new Set();
  for (const match of source.matchAll(TOKEN_PROVIDER_RE)) {
    const provideToken = match[1]?.trim() ?? "";
    const repoClass = match[2];
    if (!repoClass || CONCRETE_PROVIDER_RE.test(match[0])) continue;
    if (
      /^['"]I[A-Z][A-Za-z]*Repository['"]$/.test(provideToken) ||
      /^[A-Z][A-Z0-9_]*REPOSITORY_TOKEN$/.test(provideToken)
    ) {
      tokenizedRepoClasses.add(repoClass);
    }
  }

  const unboundRepoClasses = [...repoClasses].filter(
    (repoClass) => !tokenizedRepoClasses.has(repoClass),
  );
  if (unboundRepoClasses.length > 0) {
    advisories.push(
      `${file}: ${unboundRepoClasses.join(", ")} lack token providers`,
    );
  }
}

reportFindingsAndExit("repository-di-tokens", advisories, {
  advisory: !process.argv.includes("--enforce"),
  extraMessage:
    "Add a provider like `{ provide: X_REPOSITORY_TOKEN, useClass: PrismaXRepository }` or `{ provide: 'IXRepository', useClass: PrismaXRepository }` so consumers can inject an abstraction instead of a concrete class.",
});
