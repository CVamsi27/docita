#!/usr/bin/env node
// Verifies the three Sentry PHI scrubbers stay in parity until the
// `@workspace/utils` shared scrubber becomes canonical.
// SYSTEM_DESIGN_AND_PATTERNS.md §56 item 45.

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const REPO_ROOT = join(__dirname, "..", "..");

const FILES = [
  "packages/utils/src/monitoring/phi-scrubber.ts",
  "apps/app/shared/lib/monitoring/sentry-phi-redactor.ts",
  "apps/internal/shared/lib/monitoring/sentry-phi-redactor.ts",
];

function extractSet(label, source) {
  const re = new RegExp(`const\\s+${label}[^=]*=\\s*new\\s+Set\\(\\[([\\s\\S]*?)\\]\\)`, "m");
  const match = source.match(re);
  if (!match) return null;
  const items = [...match[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]);
  return new Set(items);
}

async function main() {
  const sets = { phi: {}, safe: {} };
  for (const rel of FILES) {
    const source = await readFile(join(REPO_ROOT, rel), "utf8");
    sets.phi[rel] = extractSet("PHI_FIELDS", source);
    sets.safe[rel] = extractSet("SAFE_FIELDS", source);
  }

  const canonical = FILES[0];
  let failed = false;
  for (const kind of ["phi", "safe"]) {
    const base = sets[kind][canonical];
    if (!base) {
      console.error(
        `[sentry-scrubber-parity] cannot locate ${kind.toUpperCase()}_FIELDS in ${canonical}`,
      );
      failed = true;
      continue;
    }
    for (const file of FILES.slice(1)) {
      const other = sets[kind][file];
      if (!other) continue;
      const missing = [...base].filter((k) => !other.has(k));
      const extra = [...other].filter((k) => !base.has(k));
      if (missing.length || extra.length) {
        failed = true;
        console.error(
          `[sentry-scrubber-parity] ${kind.toUpperCase()}_FIELDS drift between ${canonical} and ${file}`,
        );
        if (missing.length) {
          console.error(`  Missing in ${file}: ${missing.join(", ")}`);
        }
        if (extra.length) {
          console.error(`  Extra in ${file}: ${extra.join(", ")}`);
        }
      }
    }
  }

  if (failed) {
    console.error(
      "Update the divergent file(s) so all three scrubbers carry the same PHI / SAFE rule sets.",
    );
    process.exit(1);
  }
  console.log("[sentry-scrubber-parity] OK");
}

main().catch((err) => {
  console.error("[sentry-scrubber-parity] failed:", err);
  process.exit(2);
});
