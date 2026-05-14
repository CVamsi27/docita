#!/usr/bin/env node

import {
  collectFeatureBoundaryFindings,
  printReport,
} from "./lib/structure-audit.mjs";

const enforce = process.argv.includes("--enforce");
const issues = collectFeatureBoundaryFindings();

printReport("Frontend feature boundary audit", issues, { enforce });

