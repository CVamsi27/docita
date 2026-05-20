#!/usr/bin/env node

import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import process from "node:process";

const enforce = process.argv.includes("--enforce");

const READ_AUDIT_MARKER_RE =
  /\b(logPatientPhiRead|logClinicPhiListRead|logPatientPortalPhiRead|auditViewHistory|auditPortalRead|resolveContextWithAudit)\b/;

/** Controllers that expose patient PHI on GET must call a read-audit helper. */
const PHI_CONTROLLER_PATH_RES = [
  /^apps\/api\/src\/domains\/(?:patients|appointments|prescriptions|medical-documents|patient-portal|ipd)\/presentation\/controllers\/[^/]+\.controller\.ts$/,
  /^apps\/api\/src\/domains\/clinical\/presentation\/controllers\/lab-tests\.controller\.ts$/,
  /^apps\/api\/src\/domains\/billing\/presentation\/controllers\/invoices\.controller\.ts$/,
];

const EXCLUDED_CONTROLLERS = new Set([
  "apps/api/src/domains/patient-portal/presentation/controllers/patient-portal-auth.controller.ts",
  "apps/api/src/domains/appointments/presentation/controllers/doctor-delay.controller.ts",
  "apps/api/src/domains/clinical/presentation/controllers/medical-coding.controller.ts",
]);

const files = execSync("git ls-files apps/api/src/domains", {
  encoding: "utf8",
})
  .split("\n")
  .filter(Boolean)
  .filter((file) => PHI_CONTROLLER_PATH_RES.some((pattern) => pattern.test(file)))
  .filter((file) => !/\.(spec|test)\.[tj]sx?$/.test(file))
  .filter((file) => !EXCLUDED_CONTROLLERS.has(file))
  .filter((file) => existsSync(file));

const findings = [];

for (const file of files) {
  const source = readFileSync(file, "utf8");
  if (source.includes("check-phi-read-audit: allow-file")) {
    continue;
  }
  if (!/@Get\b/.test(source)) {
    continue;
  }
  if (!READ_AUDIT_MARKER_RE.test(source)) {
    findings.push(
      `${file}: PHI controller has @Get but no read-audit helper (logPatientPhiRead, logClinicPhiListRead, logPatientPortalPhiRead, auditViewHistory, auditPortalRead, or resolveContextWithAudit)`,
    );
  }
}

if (findings.length > 0) {
  console.error(
    enforce ? "PHI read-audit check failed.\n" : "PHI read-audit report:\n",
  );
  for (const finding of findings) {
    console.error(`- ${finding}`);
  }
  if (enforce) {
    process.exit(1);
  }
  console.log(
    `PHI read-audit reported ${findings.length} finding(s). Use --enforce to fail.`,
  );
  process.exit(0);
}

console.log("PHI read-audit check passed.");
