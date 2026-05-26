#!/usr/bin/env node
// Catches imports referenced from packages/ui/src/styles/globals.css
// (and any @import / @source / url() directives) so Knip's "files: off"
// rule doesn't mark them dead. Without this, renaming a file referenced
// only from CSS silently drops styles at runtime.
//
// SYSTEM_DESIGN_AND_PATTERNS.md §28.2 item 16.
// Advisory: prints the resolved set of CSS-referenced files; CI can pipe
// the output into a Knip entry list later.

import { readFile } from "node:fs/promises";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const REPO_ROOT = join(__dirname, "..", "..");
const GLOBALS_CSS = join(REPO_ROOT, "packages/ui/src/styles/globals.css");

function extractImports(css, baseDir) {
  const out = [];
  const re = /@(?:import|source)\s+(?:"([^"]+)"|'([^']+)')/g;
  let m;
  while ((m = re.exec(css))) {
    const target = m[1] ?? m[2];
    if (!target) continue;
    if (/^(https?:|tailwindcss|tw-)/.test(target)) {
      out.push({ kind: "external", target });
      continue;
    }
    out.push({
      kind: "file-or-glob",
      target,
      resolved: resolve(baseDir, target),
    });
  }
  return out;
}

async function main() {
  const css = await readFile(GLOBALS_CSS, "utf8");
  const imports = extractImports(css, dirname(GLOBALS_CSS));

  console.log(
    `[globals-css-imports] ${imports.length} reference(s) in packages/ui/src/styles/globals.css:`,
  );
  for (const ref of imports) {
    if (ref.kind === "external") {
      console.log(`  external  ${ref.target}`);
    } else {
      console.log(`  fs        ${ref.target}  →  ${ref.resolved.replace(REPO_ROOT + "/", "")}`);
    }
  }
  console.log(
    "[globals-css-imports] OK (advisory) — pipe these paths into Knip's entry list per workspace if drift occurs.",
  );
}

main().catch((err) => {
  console.error("[globals-css-imports] failed:", err);
  process.exit(2);
});
