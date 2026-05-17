#!/usr/bin/env node

import {
  collectPackageBoundaryFindings,
  printReport,
} from "./lib/structure-audit.mjs";

const enforce = process.argv.includes("--enforce");
const issues = collectPackageBoundaryFindings();

printReport("Package boundary audit", issues, { enforce });

