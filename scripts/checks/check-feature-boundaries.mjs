#!/usr/bin/env node

import {
  collectFeatureBoundaryFindings,
} from "../lib/structure-audit-feature-boundaries.mjs";
import {
  printReport,
} from "../lib/structure-audit-report.mjs";

const enforce = process.argv.includes("--enforce");
const issues = collectFeatureBoundaryFindings();

printReport("Frontend feature boundary audit", issues, { enforce });
