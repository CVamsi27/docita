#!/usr/bin/env node

import {
  collectApiDomainLayoutFindings,
  printReport,
} from "../lib/structure-audit.mjs";

const enforce = process.argv.includes("--enforce");
const issues = collectApiDomainLayoutFindings();

printReport("API domain layout audit", issues, { enforce });
