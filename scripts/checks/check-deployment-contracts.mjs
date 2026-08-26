#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const repoRoot = process.cwd();
const DOCITA_HTTPS_ORIGIN_RE = /^https:\/\/([a-z0-9-]+\.)*docita\.work$/i;

// Fly primary regions Docita has authorised for production compute.
// `bom` (Mumbai) is the historical home but was shelved by Fly on
// 2026-07-29. `sin` (Singapore) is the closest available gateway region
// and the current primary. When Fly restores bom capacity we can
// promote it back to default; until then both are valid.
const ALLOWED_FLY_PRIMARY_REGIONS = new Set(["bom", "sin"]);

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

function assertMatches(source, pattern, message) {
  assert(pattern.test(source), message);
}

function assertMissing(relativePath, message) {
  assert(!existsSync(join(repoRoot, relativePath)), message);
}

function assertExists(relativePath, message) {
  assert(existsSync(join(repoRoot, relativePath)), message);
}

function assertCloudflareBootstrapContract(layoutSource, layoutPath, helperSource) {
  assertIncludes(
    helperSource,
    "globalThis.__name",
    "Shared Cloudflare bootstrap helper must define the esbuild __name compatibility shim.",
  );
  assertIncludes(
    layoutSource,
    "esbuildHelperBootstrapScript",
    `${layoutPath} must keep the Cloudflare __name bootstrap helper.`,
  );
  assertIncludes(
    layoutSource,
    "dangerouslySetInnerHTML={{ __html: esbuildHelperBootstrapScript }}",
    `${layoutPath} must inject the Cloudflare __name bootstrap script.`,
  );
}

function parseTomlSingleQuotedEnvValue(source, key) {
  const match = source.match(new RegExp(`${key}\\s*=\\s*'([^']*)'`));
  return match?.[1] ?? null;
}

try {
  const flyTomlPath = "fly.toml";
  const workerFlyTomlPath = "apps/worker/fly.toml";
  const flyDeployScriptPath = "scripts/deploy/fly-deploy-in-primary-region.sh";
  const deployWorkflowPath = ".github/workflows/deploy.yml";
  const detectScopePath = "scripts/workflow/detect-workflow-scope.mjs";
  // Deploy workflows can be intentionally removed (deployments paused); the
  // workflow-specific contracts stay dormant while it is absent and re-arm
  // automatically if it is restored.
  const hasDeployWorkflow = existsSync(join(repoRoot, deployWorkflowPath));
  const deployWorkflowSource = hasDeployWorkflow ? read(deployWorkflowPath) : "";
  const flyTomlSource = read(flyTomlPath);
  const workerFlyTomlSource = read(workerFlyTomlPath);
  const flyDeployScriptSource = read(flyDeployScriptPath);
  const detectScopeSource = read(detectScopePath);
  const deployScopeSource = `${detectScopeSource}\n${read(
    "scripts/workflow/detect-workflow-deploy.mjs",
  )}`;
  const ciWorkflowSource = read(".github/workflows/ci.yml");
  const apiE2eWorkflowSource = read(".github/workflows/api-e2e.yml");
  const frontendCriticalE2eWorkflowSource = read(".github/workflows/frontend-critical-e2e.yml");
  // Next.js apps (apps/app, apps/internal) have been replaced by Vite apps (app, internal).
  // Middleware/layout checks are no longer needed — Vite apps use wrangler.toml static assets.

  if (hasDeployWorkflow) {
    for (const requiredPath of [
      '"scripts/workflow/detect-workflow-scope.mjs"',
      '"scripts/deploy/**"',
      '".github/workflows/deploy.yml"',
    ]) {
      assertIncludes(
        deployWorkflowSource,
        requiredPath,
        `Deploy workflow must watch ${requiredPath}.`,
      );
    }
  }

  for (const requiredDeployInput of [
    'file === ".github/workflows/deploy.yml"',
    'file === "scripts/workflow/detect-workflow-scope.mjs"',
    'file === "scripts/deploy/test-api-startup.sh"',
    'file === "scripts/deploy/fly-deploy-in-primary-region.sh"',
  ]) {
    assertIncludes(
      deployScopeSource,
      requiredDeployInput,
      `Deploy scope detector must treat ${requiredDeployInput} as an API deploy change.`,
    );
  }

  assertMatches(
    deployScopeSource,
    /isWorkerSpecificChange\(file\)\s*\|\|\s*isFlyDeployChange\(file\)/,
    "Deploy scope detector must redeploy the worker when shared Fly deployment logic changes.",
  );

  if (hasDeployWorkflow) {
    for (const requiredGuard of [
      "always() && needs.changes.outputs.api == 'true'",
      "always() && needs.changes.outputs.worker == 'true'",
    ]) {
      assertIncludes(
        deployWorkflowSource,
        requiredGuard,
        `Deploy workflow must tolerate skipped upstream jobs: missing ${requiredGuard}.`,
      );
    }

    assertIncludes(
      deployWorkflowSource,
      "needs.changes.outputs.api == 'true' || needs.changes.outputs.worker == 'true'",
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
  }

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

  for (const [configPath, configSource] of [
    [flyTomlPath, flyTomlSource],
    [workerFlyTomlPath, workerFlyTomlSource],
  ]) {
    const region = parseTomlSingleQuotedEnvValue(configSource, "primary_region");
    assert(
      ALLOWED_FLY_PRIMARY_REGIONS.has(region),
      `${configPath} primary_region must be one of [${[...ALLOWED_FLY_PRIMARY_REGIONS].join(", ")}], found "${region}".`,
    );
  }
  assert(
    parseTomlSingleQuotedEnvValue(flyTomlSource, "primary_region") ===
      parseTomlSingleQuotedEnvValue(workerFlyTomlSource, "primary_region"),
    "fly.toml and apps/worker/fly.toml must declare the same primary_region.",
  );

  assertIncludes(
    flyDeployScriptSource,
    '--primary-region "$primary_region"',
    "Fly deploy helper must use the primary_region declared in the app manifest.",
  );
  assert(
    !flyDeployScriptSource.includes("FLY_DEPLOY_REGION_FALLBACK"),
    "Fly deploy helper must not retry production deployment in another region.",
  );

  // The deploy step may call flyctl inline or delegate to a helper script.
  // Either way the zero-downtime contract holds as long as the real flyctl
  // call still uses --strategy bluegreen, so search deploy.yml plus any deploy
  // helper scripts it references.
  if (hasDeployWorkflow) {
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
  }

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
  assert(
    flyTomlSource.includes("min_machines_running = 1") ||
      (flyTomlSource.includes("min_machines_running = 0") &&
        existsSync(
          join(repoRoot, ".github/workflows/scale-api-hours.yml"),
        )),
    "fly.toml must keep one production API machine running, or set min_machines_running = 0 with .github/workflows/scale-api-hours.yml for time-based scaling.",
  );

  if (hasDeployWorkflow) {
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
  }

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
