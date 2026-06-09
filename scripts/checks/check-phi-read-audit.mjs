#!/usr/bin/env node

import { readFileSync } from "node:fs";
import {
  gitLsSourceFiles,
  reportFindingsAndExit,
} from "../lib/check-runner.mjs";

const READ_AUDIT_MARKER_RE =
  /\b(logPatientPhiRead|logClinicPhiListRead|logPatientPortalPhiRead|auditViewHistory|auditPortalRead|auditPatientPortalRead|resolveContextWithAudit)\b/;

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

const files = gitLsSourceFiles(["apps/api/src/domains"], {
  extensions: [".ts"],
  exclude: [/\.(spec|test)\.[tj]sx?$/],
})
  .filter((file) =>
    PHI_CONTROLLER_PATH_RES.some((pattern) => pattern.test(file)),
  )
  .filter((file) => !EXCLUDED_CONTROLLERS.has(file));

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
      `${file}: PHI controller has @Get but no read-audit helper (logPatientPhiRead, logClinicPhiListRead, logPatientPortalPhiRead, auditViewHistory, auditPortalRead, auditPatientPortalRead, or resolveContextWithAudit)`,
    );
  }
}

reportFindingsAndExit("PHI read-audit check", findings);
