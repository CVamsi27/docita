#!/usr/bin/env node

import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const repoRoot = process.cwd();
const enforce = process.argv.includes("--enforce");
const commandNamePattern =
  /(create|update|delete|remove|cancel|approve|reject|pay|refund|invite|assign|activate|deactivate|upload|send)/i;

const files = execSync("git ls-files apps/api/src/domains", {
  cwd: repoRoot,
  encoding: "utf8",
})
  .split("\n")
  .filter(Boolean)
  .filter((file) => /\.(service|use-case)\.ts$/.test(file))
  .filter((file) => commandNamePattern.test(path.basename(file)));

const findings = [];

for (const file of files) {
  const absolutePath = path.join(repoRoot, file);
  if (!fs.existsSync(absolutePath)) continue;
  const source = fs.readFileSync(absolutePath, "utf8");
  if (/\b(AuditLogService|auditLog|recordAudit|AuditLogged)\b/.test(source)) {
    continue;
  }
  findings.push(file);
}

if (findings.length > 0) {
  console.error(
    enforce ? "Audit logging check failed.\n" : "Audit logging report:\n",
  );
  for (const file of findings) {
    console.error(
      `- ${file}: command-like service/use-case has no explicit audit logging marker`,
    );
  }
  if (enforce) process.exit(1);
  console.log(
    `Audit logging reported ${findings.length} finding(s). Use --enforce to fail.`,
  );
  process.exit(0);
}

console.log("Audit logging check passed.");
