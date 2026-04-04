#!/usr/bin/env node

import { execSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";

const checks = [
  {
    label: "raw webhook payload logging",
    pattern: String.raw`logger\.(log|debug|warn|error)\([^)]*webhook[^)]*,\s*(payload|body|data)\b`,
  },
  {
    label: "token/password value logging",
    pattern: String.raw`logger\.(log|debug|warn|error)\([^)]*\{[^)]*\b(password|accessToken|refreshToken|authorization|jwt|token)\b\s*:`,
  },
];

const findings = [];
const SOURCE_ROOT = "apps/api/src";

const hasRipgrep = isCommandAvailable("rg");
const sourceFiles = hasRipgrep ? [] : listSourceFiles(SOURCE_ROOT);

if (!hasRipgrep) {
  process.stdout.write(
    "rg not found; falling back to built-in sensitive logging scanner.\n",
  );
}

for (const check of checks) {
  if (hasRipgrep) {
    try {
      const output = execSync(
        `rg -n --pcre2 "${check.pattern}" ${SOURCE_ROOT} --glob '!**/*.spec.ts'`,
        { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
      );

      const lines = output
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);
      for (const line of lines) {
        findings.push(`${check.label}: ${line}`);
      }
    } catch (error) {
      if (error && typeof error === "object" && "status" in error) {
        const status = Number(error.status);
        if (status === 1) {
          continue;
        }
      }
      throw error;
    }
    continue;
  }

  const matcher = new RegExp(check.pattern);
  for (const filePath of sourceFiles) {
    const contents = readFileSync(filePath, "utf8");
    const lines = contents.split("\n");
    for (let index = 0; index < lines.length; index += 1) {
      if (matcher.test(lines[index])) {
        findings.push(
          `${check.label}: ${normalizePath(filePath)}:${index + 1}:${lines[index].trim()}`,
        );
      }
    }
  }
}

if (findings.length > 0) {
  process.stderr.write(
    [
      "Sensitive logging check failed. Remove or redact the following logging patterns:",
      ...findings.map((line) => `- ${line}`),
      "",
    ].join("\n"),
  );
  process.exit(1);
}

process.stdout.write("Sensitive logging check passed.\n");

function isCommandAvailable(command) {
  try {
    execSync(`${command} --version`, { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function listSourceFiles(directory) {
  const entries = readdirSync(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...listSourceFiles(fullPath));
      continue;
    }
    if (!entry.isFile()) {
      continue;
    }
    if (!entry.name.endsWith(".ts")) {
      continue;
    }
    if (entry.name.endsWith(".spec.ts")) {
      continue;
    }
    files.push(fullPath);
  }
  return files;
}

function normalizePath(filePath) {
  return relative(process.cwd(), filePath).split("\\").join("/");
}
