#!/usr/bin/env node

import {
  collectPackageBoundaryFindings,
} from "../lib/structure-audit-package-boundaries.mjs";
import {
  printReport,
} from "../lib/structure-audit-report.mjs";

const enforce = process.argv.includes("--enforce");
const issues = collectPackageBoundaryFindings();

printReport("Package boundary audit", issues, { enforce });
