#!/usr/bin/env node

import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import process from "node:process";

const files = execSync("git ls-files apps/api/src/domains", {
  encoding: "utf8",
})
  .split("\n")
  .filter(Boolean)
  .filter((file) => /\/infrastructure\//.test(file))
  .filter((file) => /\.ts$/.test(file))
  .filter((file) => !/\.(spec|test)\.[tj]sx?$/.test(file))
  .filter((file) => existsSync(file));

const bareNewDatePattern = /\bnew Date\s*\(\s*\)/g;
const findings = [];

for (const file of files) {
  const source = readFileSync(file, "utf8");
  for (const match of source.matchAll(bareNewDatePattern)) {
    const line = source.slice(0, match.index).split(/\r?\n/).length;
    findings.push(`${file}:${line}`);
  }
}

if (findings.length > 0) {
  process.stderr.write(
    "Bare new Date() is forbidden in domain infrastructure. Inject IClock and pass clock.now(), or parse an explicit timestamp with new Date(value).\n\n",
  );
  for (const finding of findings) {
    process.stderr.write(`- ${finding}\n`);
  }
  process.exit(1);
}

process.stdout.write(
  "Domain infrastructure bare new Date() check passed.\n",
);
