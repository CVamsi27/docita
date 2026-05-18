#!/usr/bin/env node

import {
  collectRouteThinnessFindings,
  printReport,
} from "../lib/structure-audit.mjs";

const enforce = process.argv.includes("--enforce");
const issues = collectRouteThinnessFindings();

printReport("Frontend route thinness audit", issues, { enforce });

