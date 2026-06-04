#!/usr/bin/env node

import {
  collectBackendAudit,
} from "../lib/structure-audit-backend.mjs";
import {
  printReport,
} from "../lib/structure-audit-report.mjs";
import {
  writeStructureEvidence,
} from "../lib/structure-audit-evidence.mjs";

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
