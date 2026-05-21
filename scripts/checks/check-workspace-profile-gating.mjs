#!/usr/bin/env node
/**
 * FRONT_DESK workspace gating must use tier-aware helpers, not ad-hoc
 * workspaceProfile === "FRONT_DESK" outside onboarding workspace UI.
 */

import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const repoRoot = process.cwd();
const sourceExtensions = new Set([".ts", ".tsx"]);

const allowlist = new Set([
  "apps/app/features/onboarding/components/steps/plan-selection-step-helpers.tsx",
  "apps/app/features/onboarding/components/steps/PlanSelectionStep.tsx",
  "packages/types/src/shared/workspace-profile.ts",
  "packages/types/test/workspace-access.test.ts",
  "packages/types/test/workspace-profile.test.ts",
  "apps/app/shared/lib/access-control/access-policy.test.ts",
  "apps/app/shared/lib/access-control/access-policy.matrix.test.ts",
  "apps/api/test/front-desk-workspace.e2e-spec.ts",
  "apps/api/src/domains/appointments/application/services/appointment.service.workspace-profile.spec.ts",
]);

const forbidden = [
  /workspaceProfile\s*===\s*["']FRONT_DESK["']/,
  /workspaceProfile\s*!==\s*["']FRONT_DESK["']/,
];

function listFiles(root) {
  return execSync(`git ls-files ${root}`, {
    cwd: repoRoot,
    encoding: "utf8",
  })
    .split("\n")
    .filter((file) => sourceExtensions.has(path.extname(file)));
}

const files = [...listFiles("apps"), ...listFiles("packages")].filter(
  (file) => !allowlist.has(file),
);

const violations = [];

for (const file of files) {
  const absolutePath = path.join(repoRoot, file);
  if (!fs.existsSync(absolutePath)) continue;
  const lines = fs.readFileSync(absolutePath, "utf8").split(/\r?\n/);
  lines.forEach((line, index) => {
    const trimmed = line.trim();
    if (trimmed.startsWith("//") || trimmed.startsWith("*")) return;
    if (!forbidden.some((pattern) => pattern.test(line))) return;
    violations.push({ file, line: index + 1, content: trimmed });
  });
}

if (violations.length > 0) {
  console.error("Workspace profile gating check failed.\n");
  console.error(
    "Use isFrontDeskClinicMode(tier, workspaceProfile) or isFrontDeskTier(tier) instead of workspaceProfile === \"FRONT_DESK\".",
  );
  for (const violation of violations) {
    console.error(
      `  ${violation.file}:${violation.line}  ${violation.content}`,
    );
  }
  process.exit(1);
}

console.log("Workspace profile gating check passed.");
