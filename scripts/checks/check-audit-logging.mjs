#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import {
  gitLsSourceFiles,
  reportFindingsAndExit,
} from "../lib/check-runner.mjs";

const commandNamePattern =
  /(create|update|delete|remove|cancel|approve|reject|pay|refund|invite|assign|activate|deactivate|upload|send)/i;

const files = gitLsSourceFiles(["apps/api/src/domains"], {
  extensions: [".ts"],
  include: [/\.(service|use-case)\.ts$/],
}).filter((file) => commandNamePattern.test(path.basename(file)));

const findings = [];

for (const file of files) {
  if (!fs.existsSync(file)) continue;
  const source = fs.readFileSync(file, "utf8");
  if (/\b(AuditLogService|auditLog|recordAudit|AuditLogged)\b/.test(source)) {
    continue;
  }
  findings.push(file);
}

const formatted = findings.map(
  (f) =>
    `${f}: command-like service/use-case has no explicit audit logging marker`,
);
reportFindingsAndExit("Audit logging check", formatted);
