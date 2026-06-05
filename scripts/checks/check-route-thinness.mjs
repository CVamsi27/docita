#!/usr/bin/env node

import {
  collectRouteThinnessFindings,
} from "../lib/structure-audit-route-thinness.mjs";
import {
  printReport,
} from "../lib/structure-audit-report.mjs";

const enforce = process.argv.includes("--enforce");
const issues = collectRouteThinnessFindings();

printReport("Frontend route thinness audit", issues, { enforce });
