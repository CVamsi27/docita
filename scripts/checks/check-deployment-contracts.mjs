#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const repoRoot = process.cwd();
const DOCITA_HTTPS_ORIGIN_RE = /^https:\/\/([a-z0-9-]+\.)*docita\.work$/i;

function read(relativePath) {
  return readFileSync(join(repoRoot, relativePath), "utf8");
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertIncludes(source, snippet, message) {
  assert(source.includes(snippet), message);
}

function assertMissing(relativePath, message) {
  assert(!existsSync(join(repoRoot, relativePath)), message);
}

function assertExists(relativePath, message) {
  assert(existsSync(join(repoRoot, relativePath)), message);
}

function parseTomlSingleQuotedEnvValue(source, key) {
  const match = source.match(new RegExp(`${key}\\s*=\\s*'([^']*)'`));
  return match?.[1] ?? null;
}

try {
  const appMiddleware = "apps/app/middleware.ts";
  const internalMiddleware = "apps/internal/middleware.ts";
  const deployWorkflowPath = ".github/workflows/deploy.yml";
  const detectScopePath = "scripts/workflow/detect-workflow-scope.mjs";
  const appLayoutPath = "apps/app/app/layout.tsx";
  const flyTomlPath = "fly.toml";
  const stagingMirrorWorkflowPath =
    ".github/workflows/sync-staging-after-promotion.yml";

  assertExists(
    appMiddleware,
    "apps/app must keep middleware.ts for Cloudflare production builds.",
  );
  assertExists(
    internalMiddleware,
    "apps/internal must keep middleware.ts for Cloudflare production builds.",
  );
  assertMissing(
    "apps/app/proxy.ts",
    "apps/app/proxy.ts must not exist. Use middleware.ts for Cloudflare builds.",
  );
  assertMissing(
    "apps/internal/proxy.ts",
    "apps/internal/proxy.ts must not exist. Use middleware.ts for Cloudflare builds.",
  );

  const appMiddlewareSource = read(appMiddleware);
  const internalMiddlewareSource = read(internalMiddleware);
  const appLayoutSource = read(appLayoutPath);
  const deployWorkflowSource = read(deployWorkflowPath);
  const detectScopeSource = read(detectScopePath);
  const ciWorkflowSource = read(".github/workflows/ci.yml");
  const apiE2eWorkflowSource = read(".github/workflows/api-e2e.yml");
  const frontendCriticalE2eWorkflowSource = read(
    ".github/workflows/frontend-critical-e2e.yml",
  );
  const flyTomlSource = read(flyTomlPath);
  const stagingMirrorWorkflowSource = read(stagingMirrorWorkflowPath);

  assert(
    /export async function middleware/.test(appMiddlewareSource) ||
      /export function middleware/.test(appMiddlewareSource),
    "apps/app/middleware.ts must export middleware().",
  );
  assert(
    /export async function middleware/.test(internalMiddlewareSource) ||
      /export function middleware/.test(internalMiddlewareSource),
    "apps/internal/middleware.ts must export middleware().",
  );
  assertIncludes(
    appMiddlewareSource,
    'requestHeaders.set("x-nonce", nonce);',
    "apps/app/middleware.ts must propagate x-nonce for CSP-safe production boot scripts.",
  );
  assertIncludes(
    appLayoutSource,
    'get("x-nonce")',
    "apps/app/app/layout.tsx must read x-nonce from request headers.",
  );

  for (const requiredPath of [
    '"scripts/workflow/detect-workflow-scope.mjs"',
    '"scripts/deploy/test-api-startup.sh"',
    '".github/workflows/deploy.yml"',
  ]) {
    assertIncludes(
      deployWorkflowSource,
      requiredPath,
      `Deploy workflow must watch ${requiredPath}.`,
    );
  }

  for (const requiredDeployInput of [
    'file === ".github/workflows/deploy.yml"',
    'file === "scripts/workflow/detect-workflow-scope.mjs"',
    'file === "scripts/deploy/test-api-startup.sh"',
  ]) {
    assertIncludes(
      detectScopeSource,
      requiredDeployInput,
      `Deploy scope detector must treat ${requiredDeployInput} as an API deploy change.`,
    );
  }

  for (const requiredGuard of [
    "always() &&\n      needs.changes.outputs.api == 'true'",
    "always() &&\n      needs.changes.outputs.worker == 'true'",
  ]) {
    assertIncludes(
      deployWorkflowSource,
      requiredGuard,
      `Deploy workflow must tolerate skipped upstream jobs: missing ${requiredGuard}.`,
    );
  }

  assertIncludes(
    deployWorkflowSource,
    "needs.changes.outputs.api == 'true' ||\n      needs.changes.outputs.worker == 'true'",
    "migrate-db must run before any API or worker deploy, not only when packages/db changes in the last commit.",
  );

  assertIncludes(
    deployWorkflowSource,
    "needs.migrate-db.result == 'success'",
    "API and worker deploy jobs must require a successful migrate-db job (skipped migrate + deploy is forbidden).",
  );

  assertIncludes(
    deployWorkflowSource,
    "scripts/deploy/verify-db-schema-sync.sh",
    "Deploy workflow must verify production schema sync after migrations.",
  );

  for (const requiredCiBuild of [
    "pnpm --filter @docita/app run build:cloudflare",
    "pnpm --filter @docita/internal run build:cloudflare",
  ]) {
    assertIncludes(
      ciWorkflowSource,
      requiredCiBuild,
      `CI must exercise Cloudflare production builds: missing ${requiredCiBuild}.`,
    );
  }

  const corsOrigins = parseTomlSingleQuotedEnvValue(
    flyTomlSource,
    "CORS_ORIGINS",
  );
  assert(
    corsOrigins,
    "fly.toml [env] must define CORS_ORIGINS for API production deployment.",
  );

  const invalidCorsOrigins = corsOrigins
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean)
    .filter((origin) => !DOCITA_HTTPS_ORIGIN_RE.test(origin));

  assert(
    invalidCorsOrigins.length === 0,
    `fly.toml CORS_ORIGINS must only list https://*.docita.work hosts. Invalid entries: ${invalidCorsOrigins.join(", ")}`,
  );

  // The deploy step may call flyctl inline, or delegate to a helper script
  // (e.g. scripts/deploy/fly-deploy-with-region-fallback.sh) so it can retry
  // across regions when the primary region has no capacity. Either way the
  // zero-downtime contract holds as long as the real flyctl call still uses
  // --strategy bluegreen, so search deploy.yml plus any deploy helper scripts
  // it references.
  const deployStrategySource = [deployWorkflowSource]
    .concat(
      [...deployWorkflowSource.matchAll(/scripts\/deploy\/[\w./-]+\.sh/g)]
        .map((match) => match[0])
        .filter((scriptPath, index, all) => all.indexOf(scriptPath) === index)
        .map((scriptPath) => {
          try {
            return read(scriptPath);
          } catch {
            return "";
          }
        }),
    )
    .join("\n");

  assertIncludes(
    deployStrategySource,
    "--strategy bluegreen",
    "API deploy must use Fly blue-green strategy for safe traffic cutover.",
  );

  assertIncludes(
    flyTomlSource,
    "RLS_ENABLED",
    "fly.toml [env] must set RLS_ENABLED for production API.",
  );
  assertIncludes(
    flyTomlSource,
    "auto_stop_machines = 'suspend'",
    "fly.toml must suspend idle scale-out API machines instead of fully stopping them.",
  );
  assertIncludes(
    flyTomlSource,
    "min_machines_running = 1",
    "fly.toml must keep one production API machine running to avoid clinician-facing wake timeouts.",
  );

  assertIncludes(
    stagingMirrorWorkflowSource,
    "github.rest.git.updateRef",
    "Staging mirror workflow must move the staging ref to main after promotion.",
  );
  assert(
    !stagingMirrorWorkflowSource.includes("github.rest.pulls.create"),
    "Staging mirror workflow must not open sync PRs; staging is an automatic exact mirror of main.",
  );

  assertIncludes(
    deployWorkflowSource,
    "scripts/monitoring/synthetic/run-probes.mjs",
    "Deploy workflow must run post-deploy synthetic probes.",
  );
  assertIncludes(
    deployWorkflowSource,
    "SYNTHETIC_FLY_API_ORIGIN:",
    "API deploy probes must warm the direct Fly origin before validating the public edge.",
  );

  for (const [workflowPath, workflowSource] of [
    [".github/workflows/ci.yml", ciWorkflowSource],
    [".github/workflows/api-e2e.yml", apiE2eWorkflowSource],
    [
      ".github/workflows/frontend-critical-e2e.yml",
      frontendCriticalE2eWorkflowSource,
    ],
  ]) {
    assert(
      /--health-cmd\s+"pg_isready\s+-U\s+\S+\s+-d\s+\S+"/.test(workflowSource),
      `${workflowPath} Postgres healthcheck must pass an explicit user and database to pg_isready.`,
    );
  }

  process.stdout.write("Deployment contracts verified.\n");
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`Deployment contract check failed.\n${message}\n`);
  process.exit(1);
}
