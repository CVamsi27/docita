#!/usr/bin/env node

import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const repoRoot = process.cwd();
const enforce = process.argv.includes("--enforce");

const appRoots = [
  "apps/app/lib",
  "apps/app/features",
  "apps/internal/lib",
  "apps/internal/features",
].filter((root) => fs.existsSync(path.join(repoRoot, root)));

const packageTypeFiles = execSync("git ls-files packages/types/src", {
  cwd: repoRoot,
  encoding: "utf8",
})
  .split("\n")
  .filter(Boolean)
  .filter((file) => /\.(ts|tsx)$/.test(file));

const sharedShapes = new Map();

function normalizeShape(source) {
  return source
    .replace(/\/\/.*$/gm, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\s+/g, " ")
    .replace(/\s*([{}:;?,|&<>=()[\]])\s*/g, "$1")
    .trim();
}

function collectDeclarations(source) {
  const declarations = [];
  const interfacePattern =
    /\bexport\s+(?:declare\s+)?interface\s+([A-Z][A-Za-z0-9_]*)\b[^{]*({[\s\S]*?^})/gm;
  const objectTypePattern =
    /\bexport\s+type\s+([A-Z][A-Za-z0-9_]*)\s*=\s*({[\s\S]*?});/gm;

  for (const match of source.matchAll(interfacePattern)) {
    declarations.push({ name: match[1], shape: normalizeShape(match[2]) });
  }
  for (const match of source.matchAll(objectTypePattern)) {
    declarations.push({ name: match[1], shape: normalizeShape(match[2]) });
  }

  return declarations;
}

for (const file of packageTypeFiles) {
  const source = fs.readFileSync(path.join(repoRoot, file), "utf8");
  for (const declaration of collectDeclarations(source)) {
    if (!sharedShapes.has(declaration.shape)) {
      sharedShapes.set(declaration.shape, []);
    }
    sharedShapes.get(declaration.shape).push({ file, name: declaration.name });
  }
}

const appFiles = appRoots.flatMap((root) =>
  execSync(`git ls-files ${root}`, { cwd: repoRoot, encoding: "utf8" })
    .split("\n")
    .filter(Boolean)
    .filter((file) => /\.(ts|tsx)$/.test(file)),
);

const findings = [];

for (const file of appFiles) {
  const source = fs.readFileSync(path.join(repoRoot, file), "utf8");
  for (const declaration of collectDeclarations(source)) {
    const matches = sharedShapes.get(declaration.shape);
    if (!matches) continue;
    const line = source
      .slice(0, source.indexOf(declaration.name))
      .split(/\r?\n/).length;
    findings.push({
      file,
      line,
      name: declaration.name,
      matches: matches.map((match) => `${match.name} (${match.file})`),
    });
  }
}

if (findings.length > 0) {
  console.error(
    enforce
      ? "Type duplicate check failed.\n"
      : "Type duplicate boundary report:\n",
  );
  console.error(
    "App-local exported types should not mirror names already exported from packages/types.",
  );
  for (const finding of findings) {
    console.error(
      `- ${finding.file}:${finding.line} ${finding.name} duplicates ${finding.matches.join(", ")}`,
    );
  }
  if (enforce) process.exit(1);
  console.log(
    `Type duplicate check reported ${findings.length} finding(s). Use --enforce to fail.`,
  );
  process.exit(0);
}

console.log("Type duplicate check passed.");
