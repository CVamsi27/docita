#!/usr/bin/env node

import { readFileSync } from "node:fs";
import process from "node:process";

const enforce = process.argv.includes("--enforce");

/** Clinician-critical routes that must appear in nav-routes-smoke.spec.ts */
const REQUIRED_ROUTES = ["/today", "/patients", "/appointments"];

const smokeFile = "apps/app/e2e/nav-routes-smoke.spec.ts";
const source = readFileSync(smokeFile, "utf8");

const findings = [];

for (const route of REQUIRED_ROUTES) {
  if (!source.includes(`path: "${route}"`) && !source.includes(`path: '${route}'`)) {
    findings.push(
      `${smokeFile}: missing NAV_SMOKE_ROUTES entry for ${route}`,
    );
  }
}

if (findings.length > 0) {
  console.error(
    enforce ? "E2E nav routes check failed.\n" : "E2E nav routes report:\n",
  );
  for (const finding of findings) {
    console.error(`- ${finding}`);
  }
  process.exit(enforce ? 1 : 0);
}

console.log("E2E nav routes check passed.");
