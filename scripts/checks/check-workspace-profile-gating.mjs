#!/usr/bin/env node
/**
 * Front Desk gating is tier-only: clinic.tier === FRONT_DESK (see isFrontDeskTier).
 * settings.workspaceProfile and related helpers were removed.
 *
 * Script name is historical (check:workspace-profile-gating). It scans apps/,
 * packages/, and scripts/ for forbidden legacy symbols and fails the build if any
 * appear outside the allowlist below (this file + Front Desk migration SQL only).
 */

import fs from "node:fs";
import {
  gitLsSourceFiles,
  reportFindingsAndExit,
} from "../lib/check-runner.mjs";

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

const files = gitLsSourceFiles(["apps", "packages", "scripts"], {
  extensions: [".ts", ".tsx", ".mjs"],
}).filter((file) => !allowlist.has(file));

const violations = [];

for (const file of files) {
  if (!fs.existsSync(file)) continue;
  const lines = fs.readFileSync(file, "utf8").split(/\r?\n/);
  lines.forEach((line, index) => {
    const trimmed = line.trim();
    if (trimmed.startsWith("//") || trimmed.startsWith("*")) return;
    if (!forbidden.some((pattern) => pattern.test(line))) return;
    violations.push(`${file}:${index + 1}  ${trimmed}`);
  });
}

reportFindingsAndExit("check:workspace-profile-gating", violations, {
  failAlways: true,
  extraMessage:
    "Front Desk is tier-only (isFrontDeskTier / Tier.FRONT_DESK). Remove legacy workspaceProfile symbols and workspace pickers.",
});
