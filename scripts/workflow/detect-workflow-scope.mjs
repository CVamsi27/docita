#!/usr/bin/env node
import { appendFileSync, readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import {
  isDependenciesChange,
  isKnipChange,
} from "./detect-workflow-dependencies.mjs";
import { resolveRange } from "./detect-workflow-range.mjs";
import {
  isApiChange,
  isDbChange,
  isDeployApiChange,
  isDeployWorkerChange,
  isWorkerChange,
} from "./detect-workflow-api.mjs";

const scope = process.argv[2];
if (scope !== "ci" && scope !== "deploy") {
  throw new Error(
    "Usage: node scripts/workflow/detect-workflow-scope.mjs <ci|deploy>",
  );
}

const eventPath = process.env.GITHUB_EVENT_PATH;
if (!eventPath) {
  throw new Error("GITHUB_EVENT_PATH is required.");
}

const outputPath = process.env.GITHUB_OUTPUT;
if (!outputPath) {
  throw new Error("GITHUB_OUTPUT is required.");
}

const event = JSON.parse(readFileSync(eventPath, "utf8"));

const repoRoot = process.cwd();
const { baseSha, headSha } = resolveRange(event, repoRoot);
const changedFiles = execFileSync(
  "git",
  ["diff", "--name-only", baseSha, headSha],
  {
    cwd: repoRoot,
    encoding: "utf8",
  },
)
  .split(/\r?\n/)
  .filter(Boolean);

const outputs =
  scope === "ci"
    ? {
        dependencies: changedFiles.some(isDependenciesChange),
        api: changedFiles.some(isApiChange),
        app: changedFiles.some(isAppChange),
        internal: changedFiles.some(isInternalChange),
        landing: changedFiles.some(isLandingChange),
        worker: changedFiles.some(isWorkerChange),
        db: changedFiles.some(isDbChange),
        knip: changedFiles.some(isKnipChange),
      }
    : {
        api: changedFiles.some(isDeployApiChange),
        worker: changedFiles.some(isDeployWorkerChange),
        db: changedFiles.some(isDbMigrationChange),
      };

appendFileSync(
  outputPath,
  `${Object.entries(outputs)
    .map(([key, value]) => `${key}=${value}`)
    .join("\n")}\n`,
);

function isAppChange(file) {
  return (
    file === "package.json" ||
    file === "pnpm-lock.yaml" ||
    file === "pnpm-workspace.yaml" ||
    file === "turbo.json" ||
    file.startsWith("apps/app/") ||
    file.startsWith("packages/data-access/") ||
    file.startsWith("packages/hooks/") ||
    file.startsWith("packages/types/") ||
    file.startsWith("packages/ui/") ||
    file.startsWith("packages/utils/") ||
    file === "scripts/deploy/ensure-opennext-prefetch-manifest-patch.mjs"
  );
}

function isInternalChange(file) {
  return (
    file === "package.json" ||
    file === "pnpm-lock.yaml" ||
    file === "pnpm-workspace.yaml" ||
    file === "turbo.json" ||
    file.startsWith("apps/internal/") ||
    file.startsWith("packages/data-access/") ||
    file.startsWith("packages/types/") ||
    file.startsWith("packages/ui/") ||
    file.startsWith("packages/utils/") ||
    file === "scripts/deploy/ensure-opennext-prefetch-manifest-patch.mjs" ||
    file === "scripts/checks/check-worker-size.mjs"
  );
}

function isLandingChange(file) {
  return (
    file === "package.json" ||
    file === "pnpm-lock.yaml" ||
    file === "pnpm-workspace.yaml" ||
    file === "turbo.json" ||
    file.startsWith("apps/landing/") ||
    file.startsWith("packages/ui/")
  );
}

function isDbMigrationChange(file) {
  return (
    file.startsWith("packages/db/prisma/") ||
    file.startsWith("packages/db/scripts/") ||
    file === "packages/db/package.json"
  );
}
