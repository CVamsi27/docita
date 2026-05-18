#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const repoRoot = process.cwd();

const SCAN_ROOTS = [
  "apps/app",
  "apps/internal",
  "apps/landing/src",
  "packages/ui/src",
];

const SOURCE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".astro"]);

const EXCLUDED_SEGMENTS = [
  "/.next/",
  "/.open-next/",
  "/coverage/",
  "/dist/",
  "/e2e/",
  "/node_modules/",
  "/playwright-report/",
  "/test-results/",
  "/tests/",
  "/__tests__/",
];

const EXCLUDED_FILE_PATTERNS = [
  /\.spec\.[cm]?[jt]sx?$/,
  /\.test\.[cm]?[jt]sx?$/,
];

const SKIP_LINE_PATTERNS = [
  /\blogger\.(info|warn|error)\s*\(/,
  /\bnew Logger\s*\(/,
  /\bLogger\./,
];

const ABBREVIATION_ENDINGS = [/(\be\.g|\bi\.e|\betc)\.$/i];

function shouldScan(relativePath) {
  const normalized = `/${relativePath.replaceAll(path.sep, "/")}`;
  if (!SOURCE_EXTENSIONS.has(path.extname(relativePath))) return false;
  if (EXCLUDED_SEGMENTS.some((segment) => normalized.includes(segment))) return false;
  return !EXCLUDED_FILE_PATTERNS.some((pattern) => pattern.test(relativePath));
}

function walk(directory, files = []) {
  if (!fs.existsSync(directory)) return files;
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(fullPath, files);
    else files.push(fullPath);
  }
  return files;
}

function isSingleSentenceCopy(text) {
  const trimmed = text.trim();
  if (!trimmed.endsWith(".")) return false;
  if (trimmed.endsWith("...")) return false;
  if (trimmed.includes(". ")) return false;
  if (!/[A-Za-z]/.test(trimmed)) return false;
  if (trimmed.length < 4) return false;
  if (ABBREVIATION_ENDINGS.some((pattern) => pattern.test(trimmed))) return false;
  return true;
}

function stripTrailingPeriod(text) {
  return text.replace(/\.\s*$/, (match) => match.replace(".", ""));
}

function processLine(line) {
  if (SKIP_LINE_PATTERNS.some((pattern) => pattern.test(line))) return line;

  let next = line;

  // Replace simple quoted literals on this line (no newlines)
  // We intentionally keep this conservative and avoid escaped-quote heavy cases
  next = next.replace(/"([^"\n]*)\."/g, (full, inner) => {
    if (!isSingleSentenceCopy(`${inner}.`)) return full;
    return `"${stripTrailingPeriod(`${inner}.`)}"`;
  });

  next = next.replace(/'([^'\n]*)\.'/g, (full, inner) => {
    if (!isSingleSentenceCopy(`${inner}.`)) return full;
    return `'${stripTrailingPeriod(`${inner}.`)}'`;
  });

  // Replace straightforward JSX text nodes on one line: >Text.<
  next = next.replace(/>([^<\n]*\.)</g, (full, inner) => {
    if (!isSingleSentenceCopy(inner)) return full;
    return `>${stripTrailingPeriod(inner)}<`;
  });

  return next;
}

let changedFiles = 0;
let changedLines = 0;

for (const root of SCAN_ROOTS) {
  const absoluteRoot = path.join(repoRoot, root);
  for (const absolutePath of walk(absoluteRoot)) {
    const relativePath = path.relative(repoRoot, absolutePath);
    if (!shouldScan(relativePath)) continue;

    const original = fs.readFileSync(absolutePath, "utf8");
    const lines = original.split(/\r?\n/);
    let touched = false;

    const updated = lines.map((line) => {
      const processed = processLine(line);
      if (processed !== line) {
        touched = true;
        changedLines += 1;
      }
      return processed;
    });

    if (!touched) continue;
    const next = updated.join("\n");
    if (next === original) continue;

    fs.writeFileSync(absolutePath, next, "utf8");
    changedFiles += 1;
  }
}

process.stdout.write(
  `Updated ${changedFiles} file(s), changed ${changedLines} line(s)\n`,
);

