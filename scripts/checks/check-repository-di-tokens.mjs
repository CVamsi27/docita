#!/usr/bin/env node
// Verifies that every Prisma*Repository class is injected via a string
// token (e.g., `@Inject('IXRepository')`) rather than a concrete-class
// constructor parameter type — that's the convention that lets us swap
// implementations for tests and future migrations.
//
// SYSTEM_DESIGN_AND_PATTERNS.md §28.4 item 30.

import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import process from "node:process";

const ROOT = "apps/api/src/domains";
const files = execSync(`git ls-files '${ROOT}'`, { encoding: "utf8" })
  .split("\n")
  .filter(Boolean)
  .filter((f) => /\.module\.ts$/.test(f));

const advisories = [];

for (const file of files) {
  let source;
  try {
    source = readFileSync(file, "utf8");
  } catch {
    continue;
  }
  // Heuristic: a provider entry that lists a Prisma*Repository class
  // SHOULD also declare a useClass/provide pair with a string token.
  const repoClassMatches = [...source.matchAll(/Prisma[A-Z][A-Za-z]*Repository/g)];
  if (repoClassMatches.length === 0) continue;
  const hasTokenizedProvider = /provide:\s*['"]I[A-Z][A-Za-z]*Repository['"]/.test(
    source,
  );
  if (!hasTokenizedProvider) {
    advisories.push(
      `${file}: declares Prisma*Repository but no string-token provider (\`provide: 'I*Repository'\`)`,
    );
  }
}

if (advisories.length === 0) {
  process.stdout.write("[repository-di-tokens] OK\n");
  process.exit(0);
}

process.stderr.write(
  `[repository-di-tokens] ${advisories.length} advisory finding(s):\n`,
);
for (const finding of advisories) {
  process.stderr.write(`  - ${finding}\n`);
}
process.stderr.write(
  "Add a provider like `{ provide: 'IXRepository', useClass: PrismaXRepository }` so consumers can `@Inject('IXRepository')` instead of binding to the concrete class.\n",
);
process.exit(0); // advisory
