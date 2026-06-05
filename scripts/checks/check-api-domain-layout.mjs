#!/usr/bin/env node

import {
  collectApiDomainLayoutFindings,
} from "../lib/structure-audit-api-domain-layout.mjs";
import {
  printReport,
} from "../lib/structure-audit-report.mjs";

const enforce = process.argv.includes("--enforce");
const issues = collectApiDomainLayoutFindings();

printReport("API domain layout audit", issues, { enforce });
