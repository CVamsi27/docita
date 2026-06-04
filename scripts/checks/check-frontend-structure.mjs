#!/usr/bin/env node

import {
  collectFrontendAudit,
} from "../lib/structure-audit-frontend.mjs";
import {
  printReport,
} from "../lib/structure-audit-report.mjs";
import {
  writeStructureEvidence,
} from "../lib/structure-audit-evidence.mjs";

const args = new Set(process.argv.slice(2));
const enforce = args.has("--enforce");
const write = args.has("--write");

const audit = collectFrontendAudit();
printReport("Frontend structure audit", audit.issues, { enforce });

if (write) {
  const result = writeStructureEvidence();
  console.log(
    `Wrote structure evidence (${result.frontendIssues} frontend finding(s), ${result.backendIssues} backend finding(s)).`,
  );
}
