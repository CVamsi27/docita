#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const repoRoot = process.cwd();

const SCAN_ROOTS = [
  "apps/app-vite/src",
  "apps/internal-vite/src",
  "apps/landing/src",
  "packages/ui/src",
];

const SOURCE_EXTENSIONS = new Set([
  ".astro",
  ".js",
  ".jsx",
  ".mjs",
  ".ts",
  ".tsx",
]);

const APPROVED_TOAST_WRAPPERS = new Set([
  "apps/app-vite/src/lib/errors/user-facing-errors.ts",
  "apps/internal-vite/src/lib/errors/user-facing-errors.ts",
]);

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
  /sentry\.(client|server|edge)\.config\.ts$/,
  /client-error-reporting\.ts$/,
  /client-error-reporter\.tsx$/,
  /system-logs-page\.tsx$/,
  /audit-logs-page\.tsx$/,
  /system-monitoring\/page\.tsx$/,
  /performance\/page\.tsx$/,
];

const VISIBLE_SINK_LINE_PATTERN =
  /(showUserFacingErrorToast|toast\.error|set[A-Za-z0-9_]*Error|errorMessage=|errorMessage:|message=|<ErrorState|<DataState|<ErrorBanner|<AlertDescription|throw new Error)/;

const BANNED_VISIBLE_TERMS = [
  /\bAPI\b/,
  /\bbackend\b/i,
  /\bclinic id\b/i,
  /\bdatabase\b/i,
  /\bdigest\b/i,
  /\berror id\b/i,
  /\bevent id\b/i,
  /\bexternal service\b/i,
  /\bHTTP\b/,
  /\binternal error\b/i,
  /\bprovider\b/i,
  /\bPrisma\b/,
  /\brequest failed\b/i,
  /\bresponse validation\b/i,
  /\bSDK\b/,
  /\bschema\b/i,
  /\bserver\b/i,
  /\bstatus code\b/i,
  /\btoken\b/i,
  /\bvalidation failed\b/i,
  /\bZod\b/,
];

const RULES = [
  {
    name: "toast.error must only be used in safe wrappers",
    appliesTo(relativePath) {
      return !APPROVED_TOAST_WRAPPERS.has(relativePath);
    },
    test(line) {
      return /\btoast\.error\s*\(/.test(line);
    },
  },
  {
    name: "raw Error.message must not be passed into visible error sinks",
    test(line) {
      return (
        /(showUserFacingErrorToast|set[A-Za-z0-9_]*Error|errorMessage:|errorMessage=|message=)[^\n]*(err|error)\.message/.test(
          line,
        ) &&
        !/logger\.|captureException|captureMessage|isNetworkError|includes\(/.test(
          line,
        )
      );
    },
  },
  {
    name: "response text/status details must not be passed into visible error sinks",
    test(line) {
      return (
        VISIBLE_SINK_LINE_PATTERN.test(line) &&
        /(statusText|response\.text\(\)|\.detail\b|\bdata\.message\b|\bpayload\.message\b)/.test(
          line,
        )
      );
    },
  },
  {
    name: "route error pages must not display debug identifiers",
    appliesTo(relativePath) {
      return /(^|\/)(global-)?error\.tsx$/.test(relativePath);
    },
    test(line) {
      return (
        /(Error ID|Event ID|Request ID|error\.digest)/.test(line) &&
        !/captureException|captureMessage/.test(line)
      );
    },
  },
  {
    name: "visible error copy must not contain technical terms",
    test(line) {
      return (
        VISIBLE_SINK_LINE_PATTERN.test(line) &&
        /["'`]/.test(line) &&
        BANNED_VISIBLE_TERMS.some((pattern) => pattern.test(line))
      );
    },
  },
  {
    name: "visible error copy must use polished action language",
    test(line) {
      return (
        VISIBLE_SINK_LINE_PATTERN.test(line) &&
        /["'`](Failed to|Unable to|Could not|Payment failed|Registration failed)\b/.test(
          line,
        )
      );
    },
  },
  {
    name: "visible error copy must not use vague error wording",
    test(line) {
      return (
        VISIBLE_SINK_LINE_PATTERN.test(line) &&
        /["'`](An error occurred|Unknown error|Something went wrong|We could not load this information|We could not complete this action|We could not continue right now|unexpected error|Please fill in all required fields|Invalid input)\b/i.test(
          line,
        )
      );
    },
  },
  {
    name: "visible error copy must not expose internal context wording",
    test(line) {
      return (
        VISIBLE_SINK_LINE_PATTERN.test(line) &&
        /["'`](Missing .*context|.*context is required)\b/i.test(line)
      );
    },
  },
  {
    name: "route error pages must use clear page-load copy",
    appliesTo(relativePath) {
      return /(^|\/)(global-)?error\.tsx$/.test(relativePath) || /error-boundary\.tsx$/.test(relativePath);
    },
    test(line) {
      return /Something went wrong|unexpected error/i.test(line);
    },
  },
];

function shouldScan(relativePath) {
  const normalized = `/${relativePath.replaceAll(path.sep, "/")}`;
  if (!SOURCE_EXTENSIONS.has(path.extname(relativePath))) {
    return false;
  }
  if (EXCLUDED_SEGMENTS.some((segment) => normalized.includes(segment))) {
    return false;
  }
  return !EXCLUDED_FILE_PATTERNS.some((pattern) => pattern.test(relativePath));
}

function walk(directory, files = []) {
  if (!fs.existsSync(directory)) return files;

  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath, files);
    } else {
      files.push(fullPath);
    }
  }

  return files;
}

const failures = [];

for (const root of SCAN_ROOTS) {
  for (const absolutePath of walk(path.join(repoRoot, root))) {
    const relativePath = path.relative(repoRoot, absolutePath);
    if (!shouldScan(relativePath)) continue;

    const lines = fs.readFileSync(absolutePath, "utf8").split(/\r?\n/);
    lines.forEach((line, index) => {
      RULES.forEach((rule) => {
        if (rule.appliesTo && !rule.appliesTo(relativePath)) return;
        if (!rule.test(line)) return;
        failures.push({
          file: relativePath,
          line: index + 1,
          rule: rule.name,
          text: line.trim(),
        });
      });
    });
  }
}

if (failures.length > 0) {
  process.stderr.write("User-facing error copy check failed:\n");
  failures.forEach((failure) => {
    process.stderr.write(
      `- ${failure.file}:${failure.line} ${failure.rule}\n  ${failure.text}\n`,
    );
  });
  process.exit(1);
}

process.stdout.write("User-facing error copy check passed.\n");
