#!/usr/bin/env node

import {
  collectBackendAudit,
  printReport,
  writeStructureEvidence,
} from "./lib/structure-audit.mjs";

const args = new Set(process.argv.slice(2));
const enforce = args.has("--enforce");
const write = args.has("--write");

const audit = collectBackendAudit();
printReport("Backend structure audit", audit.issues, { enforce });

if (write) {
  const result = writeStructureEvidence();
  console.log(
    `Wrote structure evidence (${result.frontendIssues} frontend finding(s), ${result.backendIssues} backend finding(s)).`,
  );
}
