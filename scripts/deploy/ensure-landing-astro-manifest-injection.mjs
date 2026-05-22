#!/usr/bin/env node

/**
 * Astro 6 + @astrojs/cloudflare leaves @@ASTRO_MANIFEST_REPLACE@@ in worker
 * bundles: chunk detection keys off moduleIds only, and runManifestInjection
 * is scheduled in a buildApp post hook that does not run after the Cloudflare
 * builder finishes. Cloudflare deploy then fails with "Invalid URL string".
 *
 * Patch Astro's build until upstream fixes both issues.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..", "..");

const MANIFEST_PLACEHOLDER = "@@ASTRO_MANIFEST_REPLACE@@";

const PATCHES = [
  {
    label: "static-build chunk extraction",
    relativePath: path.join("dist", "core", "build", "static-build.js"),
    needle:
      "const needsManifestInjection = chunk.moduleIds.includes(SERIALIZED_MANIFEST_RESOLVED_ID);",
    replacement:
      `const needsManifestInjection = chunk.moduleIds.includes(SERIALIZED_MANIFEST_RESOLVED_ID) || chunk.code.includes("${MANIFEST_PLACEHOLDER}");`,
  },
  {
    label: "static-build run manifest injection after SSR bundle",
    relativePath: path.join("dist", "core", "build", "static-build.js"),
    needle: "        internals.extractedChunks = [...ssrChunks, ...prerenderChunks];",
    replacement: `        internals.extractedChunks = [...ssrChunks, ...prerenderChunks];
        await runManifestInjection(
          opts,
          internals,
          internals.extractedChunks,
          buildPostHooks,
        );`,
  },
  {
    label: "plugin-manifest SSR chunk lookup",
    relativePath: path.join("dist", "core", "build", "plugins", "plugin-manifest.js"),
    needle:
      "    (c) => !c.prerender && c.moduleIds.includes(SERIALIZED_MANIFEST_RESOLVED_ID)",
    replacement:
      `    (c) =>
      !c.prerender &&
      (c.moduleIds.includes(SERIALIZED_MANIFEST_RESOLVED_ID) ||
        c.code.includes(MANIFEST_REPLACE))`,
  },
  {
    label: "plugin-manifest prerender chunk lookup",
    relativePath: path.join("dist", "core", "build", "plugins", "plugin-manifest.js"),
    needle:
      "    (c) => c.prerender && c.moduleIds.includes(SERIALIZED_MANIFEST_RESOLVED_ID)",
    replacement:
      `    (c) =>
      c.prerender &&
      (c.moduleIds.includes(SERIALIZED_MANIFEST_RESOLVED_ID) ||
        c.code.includes(MANIFEST_REPLACE))`,
  },
];

function resolveAstroPackageRoots() {
  const candidates = [
    path.join(repoRoot, "node_modules", "astro"),
    path.join(repoRoot, "apps", "landing", "node_modules", "astro"),
  ];
  return candidates.filter((dir) =>
    fs.existsSync(path.join(dir, PATCHES[0].relativePath)),
  );
}

function applyPatch(targetFile, patch) {
  const source = fs.readFileSync(targetFile, "utf8");

  if (
    source.includes(patch.replacement) ||
    (patch.label.includes("run manifest injection") &&
      source.includes("await runManifestInjection(\n          opts,\n          internals,\n          internals.extractedChunks,"))
  ) {
    return "already";
  }

  if (!source.includes(patch.needle)) {
    throw new Error(
      `Expected Astro patch needle for "${patch.label}" not found in ${targetFile}.`,
    );
  }

  fs.writeFileSync(targetFile, source.replace(patch.needle, patch.replacement), "utf8");
  return "patched";
}

function main() {
  const astroRoots = resolveAstroPackageRoots();
  if (astroRoots.length === 0) {
    throw new Error(
      "Could not find astro package under repo or apps/landing node_modules.",
    );
  }

  for (const astroRoot of astroRoots) {
    for (const patch of PATCHES) {
      const targetFile = path.join(astroRoot, patch.relativePath);
      const result = applyPatch(targetFile, patch);
      console.log(
        `[ok] ${patch.label} (${path.relative(repoRoot, targetFile)})${result === "patched" ? "" : " — already applied"}`,
      );
    }
  }
}

main();
