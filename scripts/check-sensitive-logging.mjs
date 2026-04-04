#!/usr/bin/env node

import { execSync } from "node:child_process";

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

for (const check of checks) {
  try {
    const output = execSync(
      `rg -n --pcre2 "${check.pattern}" apps/api/src --glob '!**/*.spec.ts'`,
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
