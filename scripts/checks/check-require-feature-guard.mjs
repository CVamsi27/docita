#!/usr/bin/env node

import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

import { trackedFileExists } from "../lib/check-runner.mjs";

const repoRoot = process.cwd();

const controllerFiles = execSync("git ls-files 'apps/api/src/**/*.controller.ts'", {
  cwd: repoRoot,
  encoding: "utf8",
})
  .split("\n")
  .filter(Boolean)
  .filter(trackedFileExists);

const accessFiles = new Set(
  execSync("git ls-files 'apps/api/src/**/*.access.ts'", {
    cwd: repoRoot,
    encoding: "utf8",
  })
    .split("\n")
    .filter(Boolean)
    .filter(trackedFileExists),
);

function fileHasTierGuard(filePath) {
  const content = fs.readFileSync(path.join(repoRoot, filePath), "utf8");
  return /UseGuards\([^)]*TierGuard/.test(content);
}

function resolveImportPath(controllerDir, importPath) {
  if (importPath.startsWith("@/")) {
    return path.join(
      repoRoot,
      "apps/api/src",
      importPath.slice(2).replace(/\.ts$/, "") + ".ts",
    );
  }
  return path.resolve(controllerDir, importPath.replace(/\.ts$/, "") + ".ts");
}

function controllerHasTierGuardEnforcement(controllerPath, content) {
  if (/UseGuards\([^)]*TierGuard/.test(content)) {
    return true;
  }

  const apiAccessDecorators = content.match(/@(\w+ApiAccess)\(\)/g);
  if (!apiAccessDecorators) {
    return false;
  }

  const controllerDir = path.dirname(path.join(repoRoot, controllerPath));

  for (const decoratorRef of apiAccessDecorators) {
    const fnName = decoratorRef.match(/@(\w+ApiAccess)\(\)/)?.[1];
    if (!fnName) continue;

    const importRegex = new RegExp(
      `import\\s*\\{[^}]*\\b${fnName}\\b[^}]*\\}\\s*from\\s*['"]([^'"]+)['"]`,
    );
    const importMatch = content.match(importRegex);
    if (!importMatch) continue;

    const resolved = resolveImportPath(controllerDir, importMatch[1]);
    const relative = path.relative(repoRoot, resolved);
    if (accessFiles.has(relative) && fileHasTierGuard(relative)) {
      return true;
    }
  }

  return false;
}

const violations = [];

for (const file of controllerFiles) {
  const content = fs.readFileSync(path.join(repoRoot, file), "utf8");
  if (!/@RequireFeature\b/.test(content)) continue;

  if (!controllerHasTierGuardEnforcement(file, content)) {
    violations.push(file);
  }
}

if (violations.length > 0) {
  console.error(
    "RequireFeature guard check failed. @RequireFeature requires TierGuard on the controller or via an *ApiAccess() composite that bundles TierGuard:\n",
  );
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  process.exit(1);
}

console.log(
  `RequireFeature guard check passed (${controllerFiles.length} controller files scanned).`,
);
