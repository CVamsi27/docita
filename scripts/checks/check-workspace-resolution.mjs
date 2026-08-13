#!/usr/bin/env node
// Verifies that every `@workspace/*` import in each app resolves through that
// app's own config surfaces (tsconfig paths / vite alias / vitest alias / jest
// moduleNameMapper) or to a package whose dist the app's CI quality job builds.
//
// Why this exists: post-#236, the quality jobs no longer build workspace dists
// for app/internal (they resolve @workspace/* to package src via aliases), and
// #237 fixed a latent gap where internal's vitest.config.ts aliased only
// `ui` + `types` while its tsconfig/vite aliased all five — so vitest tests
// silently resolved utils/hooks/data-access via node_modules -> dist, which CI
// no longer builds. This check closes that class permanently: if a config
// surface stops src-aliasing a package the app imports, the app must build the
// package's dist, or the check fails.
//
// Model per app:
//   - surfaces: the config files that map `@workspace/X` (bare or subpath) to
//     src. An import is "src-resolved" only if EVERY surface resolves it to
//     src (each surface maps to a real CI step: tsc / vite build / vitest /
//     jest).
//   - CI_BUILT: packages whose dist the app's quality job builds (ci.yml
//     "Build <app> workspace dependencies" steps). A dist-resolving surface is
//     fine iff the package is CI-built.
//   - A finding fires only when some surface resolves the import to dist AND
//     the package is not CI-built for that app.
//
// Subpaths are handled: `@workspace/utils/http/cloudflare-api-proxy`
// normalizes to package `utils`, and each surface checks the full specifier
// against its alias/mapper semantics (tsconfig `@workspace/X/*`, vite/vitest
// string-prefix aliases, jest anchored regexes in declaration order).
//
// The CI_BUILT map is verified against ci.yml so drift is loud: if a quality
// job's build step changes without updating this map, the check fails.

import { readFileSync } from "node:fs";
import path from "node:path";
import { gitLsSourceFiles, reportFindingsAndExit } from "../lib/check-runner.mjs";

// App -> config files that act as resolution surfaces for that app.
const APP_SURFACES = {
  "apps/app": ["tsconfig.json", "vite.config.ts", "vitest.config.ts"],
  "apps/internal": ["tsconfig.json", "vite.config.ts", "vitest.config.ts"],
  "apps/api": ["tsconfig.json", "jest.config.ts", "test/jest-e2e.json"],
  "apps/landing": ["tsconfig.json", "astro.config.mjs"],
  "apps/worker": ["tsconfig.json", "jest.config.cjs"],
};

// App -> workspace packages whose dist its CI quality job builds. Mirrors the
// `Build <app> workspace dependencies` steps in ci.yml (api-quality builds
// types/authorization/utils/auth/db; landing-quality builds
// types/utils/hooks/ui; app/internal/worker quality jobs build nothing).
// Kept in sync by the ci.yml consistency check below.
const CI_BUILT = {
  "apps/api": ["types", "authorization", "utils", "auth", "db"],
  "apps/landing": ["types", "utils", "hooks", "ui"],
  "apps/app": [],
  "apps/internal": [],
  "apps/worker": [],
};

// ci.yml job key -> app dir, for the CI-built consistency check.
const CI_JOB_TO_APP = {
  "app-quality": "apps/app",
  "internal-quality": "apps/internal",
  "worker-quality": "apps/worker",
  "api-quality": "apps/api",
  "landing-quality": "apps/landing",
};

// Import forms that resolve a module specifier: `from "…"`, `import "…"`,
// `import("…")`, `require("…")`, and vitest `vi.mock`/`vi.importActual`
// (their specifiers go through the same resolver as imports).
const IMPORT_RE =
  /(?:\bfrom\s+|\bimport\s*\(?\s*|\brequire\s*\()\s*["'](@workspace\/[^"']+)["']|vi\.(?:mock|importActual)\s*\(\s*["'](@workspace\/[^"']+)["']/g;

/** tsconfig compilerOptions.paths src-aliases (set of workspace pkg names). */
function tsconfigSrcAliases(app) {
  const file = path.join(app, "tsconfig.json");
  try {
    const cfg = JSON.parse(readFileSync(file, "utf8"));
    const paths = cfg.compilerOptions?.paths ?? {};
    const aliased = new Set();
    for (const [key, targets] of Object.entries(paths)) {
      const m = key.match(/^@workspace\/([a-zA-Z0-9-]+)(?:\/\*)?$/);
      if (!m) continue;
      const mapsToSrc = (targets ?? []).some(
        (t) => t.includes("/src/") || t.endsWith("src/index"),
      );
      if (mapsToSrc) aliased.add(m[1]);
    }
    return aliased;
  } catch {
    return new Set();
  }
}

/** vite/vitest resolve.alias src-aliases (set of workspace pkg names). */
function viteSrcAliases(file) {
  try {
    const text = readFileSync(file, "utf8");
    const aliased = new Set();
    const re = /["']@workspace\/([a-zA-Z0-9-]+)["']\s*:\s*path\.resolve\([^)]*packages\/[^"'/]+\/src/g;
    let m;
    while ((m = re.exec(text)) !== null) aliased.add(m[1]);
    return aliased;
  } catch {
    return new Set();
  }
}

/**
 * jest moduleNameMapper entries in declaration order:
 * [{ key: '^@workspace/db$', target: '<rootDir>/…/src/index.ts' }, …].
 * First-match wins (jest semantics); a dist target means the surface resolves
 * the package via node_modules -> dist.
 */
function jestModuleMap(file) {
  try {
    const text = readFileSync(file, "utf8");
    let block;
    if (file.endsWith(".json")) {
      const cfg = JSON.parse(text);
      block = cfg.moduleNameMapper ?? {};
      return Object.entries(block).map(([key, target]) => ({ key, target }));
    }
    const m = text.match(/moduleNameMapper\s*:\s*\{([\s\S]*?)\n\s*\}/);
    if (!m) return [];
    const entries = [];
    const re = /["'](\^@workspace[^"']*)["']\s*:\s*["']([^"']+)["']/g;
    let e;
    while ((e = re.exec(m[1])) !== null) {
      entries.push({ key: e[1], target: e[2] });
    }
    return entries;
  } catch {
    return [];
  }
}

/** Does a single surface resolve the given specifier to package src? */
function surfaceResolvesToSrc(surfacePath, specifier) {
  const base = path.basename(surfacePath);
  const pkg = specifier.split("/")[1];
  if (base === "tsconfig.json") {
    return tsconfigSrcAliases(path.dirname(surfacePath)).has(pkg);
  }
  if (base === "vite.config.ts" || base === "vitest.config.ts") {
    return viteSrcAliases(surfacePath).has(pkg);
  }
  if (base === "astro.config.mjs") {
    // Landing declares no @workspace aliases today (only `@`); every
    // @workspace import resolves via node_modules -> dist, so it must be
    // CI-built. If a workspace alias is added here later, extend this.
    return false;
  }
  if (base.startsWith("jest")) {
    const entries = jestModuleMap(surfacePath);
    const match = entries.find((e) => new RegExp(e.key).test(specifier));
    if (!match) return false;
    return match.target.includes("/src/") || match.target.endsWith("src/index.ts");
  }
  return false;
}

/**
 * Parse ci.yml: for each quality job, the set of `pnpm --filter
 * @workspace/<pkg> run build` lines. Returns null when ci.yml is unreadable
 * (e.g. a minimal fixture) — the hardcoded CI_BUILT map then stands alone.
 */
function ciBuiltFromYml() {
  let text;
  try {
    text = readFileSync(".github/workflows/ci.yml", "utf8");
  } catch {
    return null;
  }
  const blocks = {};
  let current = null;
  for (const line of text.split("\n")) {
    const header = line.match(/^  ([a-z][a-z0-9-]*):\s*$/);
    if (header) {
      current = header[1];
      blocks[current] = [];
      continue;
    }
    if (current) blocks[current].push(line);
  }
  const byApp = {};
  for (const [job, app] of Object.entries(CI_JOB_TO_APP)) {
    const built = new Set();
    for (const line of blocks[job] ?? []) {
      const m = line.match(/pnpm --filter @workspace\/([a-zA-Z0-9-]+) run build/);
      if (m) built.add(m[1]);
    }
    byApp[app] = [...built];
  }
  return byApp;
}

const findings = [];

// 1) Consistency: hardcoded CI_BUILT must match ci.yml quality-job build steps.
const ymlBuilt = ciBuiltFromYml();
if (ymlBuilt !== null) {
  for (const app of Object.keys(CI_BUILT)) {
    const fromYml = (ymlBuilt[app] ?? []).sort().join(", ");
    const hardcoded = [...CI_BUILT[app]].sort().join(", ");
    if (fromYml !== hardcoded) {
      findings.push(
        `${app} CI_BUILT drift: ci.yml quality job builds [${fromYml}] but this check lists [${hardcoded}]. Update CI_BUILT in check-workspace-resolution.mjs to match ci.yml.`,
      );
    }
  }
} else {
  process.stdout.write(
    "[workspace-resolution] ci.yml not found — using the hardcoded CI_BUILT map only.\n",
  );
}

// 2) Per app: every @workspace/* import must be src-resolved on every surface
//    or CI-built.
for (const [app, surfaces] of Object.entries(APP_SURFACES)) {
  const built = CI_BUILT[app] ?? [];
  const files = gitLsSourceFiles([app], { extensions: [".ts", ".tsx", ".astro"] });
  const imports = new Map(); // specifier -> [{ file, line }]
  for (const file of files) {
    const lines = readFileSync(file, "utf8").split(/\r?\n/);
    lines.forEach((line, index) => {
      IMPORT_RE.lastIndex = 0;
      let m;
      while ((m = IMPORT_RE.exec(line)) !== null) {
        const specifier = m[1] ?? m[2];
        if (!specifier) continue;
        if (!imports.has(specifier)) imports.set(specifier, []);
        imports.get(specifier).push({ file, line: index + 1 });
      }
    });
  }

  for (const [specifier, sites] of imports) {
    const pkg = specifier.split("/")[1];
    const unresolved = surfaces.filter(
      (s) => !surfaceResolvesToSrc(path.join(app, s), specifier),
    );
    if (unresolved.length === 0) continue; // every surface src-resolves it
    if (built.includes(pkg)) continue; // dist exists (CI builds it)

    const firstSite = `${sites[0].file}:${sites[0].line}`;
    const extra = sites.length > 1 ? ` (+${sites.length - 1} more site(s))` : "";
    findings.push(
      `${app}: ${specifier} (${firstSite}${extra}) is not src-aliased in ${unresolved.join(
        ", ",
      )} and ${pkg} is not built by ${app}'s CI quality job — the import would resolve to a missing dist. Add a src alias for ${pkg} to every ${app} surface (tsconfig/vite/vitest/jest) or build ${pkg} in ${app}'s quality job (ci.yml + CI_BUILT here).`,
    );
  }
}

reportFindingsAndExit("Workspace resolution check", findings, {
  failAlways: true,
  extraMessage:
    "Every @workspace/* import in an app must resolve to package src through that app's config surfaces, or to a dist the app's CI quality job builds. This closes the #237 alias-gap class (a config surface dropping a src alias while CI no longer builds dists).",
});
