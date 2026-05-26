#!/usr/bin/env node
/**
 * Front Desk gating is tier-only: clinic.tier is a Front Desk SKU (see isFrontDeskTier).
 * settings.workspaceProfile and related helpers were removed.
 *
 * Script name is historical (check:workspace-profile-gating). It scans apps/,
 * packages/, and scripts/ for forbidden legacy symbols and fails the build if any
 * appear outside the allowlist below (this file + Front Desk migration SQL only).
 */

import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const repoRoot = process.cwd();
const sourceExtensions = new Set([".ts", ".tsx", ".mjs"]);

const allowlist = new Set([
  "scripts/checks/check-workspace-profile-gating.mjs",
  "packages/db/prisma/migrations/20260504190000_front_desk_tier_app_login_disabled/migration.sql",
  "packages/db/prisma/migrations/20260521120000_remove_workspace_profile/migration.sql",
]);

const forbidden = [
  /\bworkspaceProfile\b/,
  /\bWorkspaceProfile\b/,
  /\bisFrontDeskClinicMode\b/,
  /\bisFrontDeskWorkspace\b/,
  /\bparseWorkspaceProfile\b/,
  /\bresolveWorkspaceProfileForPlan\b/,
  /\bshouldDenyAccessForWorkspaceProfile\b/,
  /\bWORKSPACE_PROFILE_/,
  /\bworkspace-profile\.ts\b/,
  /\bWorkspaceModeCard\b/,
  /\bWorkspaceSelector\b/,
];

function listFiles(root) {
  return execSync(`git ls-files ${root}`, {
    cwd: repoRoot,
    encoding: "utf8",
  })
    .split("\n")
    .filter((file) => sourceExtensions.has(path.extname(file)));
}

const files = [...listFiles("apps"), ...listFiles("packages"), ...listFiles("scripts")].filter(
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
  console.error("check:workspace-profile-gating failed.\n");
  console.error(
    "Front Desk is tier-only (isFrontDeskTier / Front Desk SKUs). Remove legacy workspaceProfile symbols and workspace pickers.",
  );
  for (const violation of violations) {
    console.error(
      `  ${violation.file}:${violation.line}  ${violation.content}`,
    );
  }
  process.exit(1);
}

console.log("check:workspace-profile-gating passed (tier-only Front Desk; no legacy symbols).");
