#!/usr/bin/env node
import { appendFileSync, readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

const scope = process.argv[2];
if (scope !== "ci" && scope !== "deploy") {
  throw new Error("Usage: node scripts/workflow/detect-workflow-scope.mjs <ci|deploy>");
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

function resolveRange(event, cwd) {
  const baseSha = event.pull_request?.base?.sha;
  const headSha = event.pull_request?.head?.sha;
  if (baseSha && headSha) {
    const mergeBase = execFileSync("git", ["merge-base", baseSha, headSha], {
      cwd,
      encoding: "utf8",
    }).trim();
    if (!mergeBase) {
      throw new Error(
        "Unable to determine merge base for pull request changes.",
      );
    }
    return { baseSha: mergeBase, headSha };
  }

  if (event.before && event.after) {
    return { baseSha: event.before, headSha: event.after };
  }

  throw new Error(
    "Unable to resolve diff range from the GitHub event payload.",
  );
}

function isDependenciesChange(file) {
  return (
    file === "package.json" ||
    file === "pnpm-lock.yaml" ||
    file === "pnpm-workspace.yaml" ||
    (file.startsWith("apps/") && file.endsWith("/package.json")) ||
    (file.startsWith("packages/") && file.endsWith("/package.json"))
  );
}

function isKnipChange(file) {
  return (
    isDependenciesChange(file) ||
    file === "knip.json" ||
    file === "turbo.json" ||
    file.startsWith("apps/") ||
    file.startsWith("packages/") ||
    file.startsWith("scripts/")
  );
}

function isApiChange(file) {
  return (
    isSharedApiChange(file) ||
    file.startsWith("apps/api/") ||
    file.startsWith("packages/auth/")
  );
}

function isDeployApiChange(file) {
  return (
    isApiChange(file) ||
    isFlyDeployChange(file) ||
    file === "scripts/deploy/test-api-startup.sh"
  );
}

function isDeployWorkerChange(file) {
  return (
    isApiChange(file) ||
    isWorkerSpecificChange(file) ||
    isFlyDeployChange(file)
  );
}

function isFlyDeployChange(file) {
  return (
    file === ".github/workflows/deploy.yml" ||
    file === "scripts/workflow/detect-workflow-scope.mjs" ||
    file === "scripts/deploy/fly-deploy-in-primary-region.sh"
  );
}

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

function isDbChange(file) {
  return (
    isSharedApiChange(file) ||
    file.startsWith("apps/api/") ||
    file.startsWith("packages/auth/")
  );
}

function isDbMigrationChange(file) {
  return (
    file.startsWith("packages/db/prisma/") ||
    file.startsWith("packages/db/scripts/") ||
    file === "packages/db/package.json"
  );
}

function isSharedApiRootChange(file) {
  return (
    file === "package.json" ||
    file === "pnpm-lock.yaml" ||
    file === "pnpm-workspace.yaml" ||
    file === "turbo.json" ||
    file === "fly.toml"
  );
}

function isWorkerChange(file) {
  return (
    isSharedApiChange(file) ||
    file.startsWith("apps/api/") ||
    isWorkerSpecificChange(file)
  );
}

function isSharedApiChange(file) {
  return (
    isSharedApiRootChange(file) ||
    file.startsWith("packages/db/") ||
    file.startsWith("packages/types/") ||
    file.startsWith("packages/utils/")
  );
}

function isWorkerSpecificChange(file) {
  return (
    file === "apps/worker/fly.toml" ||
    file === "apps/worker/Dockerfile" ||
    file === "apps/api/Dockerfile" ||
    file === "packages/typescript-config/nestjs.json" ||
    file.startsWith("apps/worker/") ||
    file === "apps/api/src/worker.module.ts"
  );
}
