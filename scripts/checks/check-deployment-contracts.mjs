#!/usr/bin/env node
import { existsSync, readFileSync, readdirSync } from "node:fs";
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

function parseSemver(raw) {
  const match = /(\d+)\.(\d+)\.(\d+)/.exec(raw ?? "");
  return match ? match.slice(1, 4).map(Number) : null;
}

function compareSemver(left, right) {
  for (let index = 0; index < 3; index += 1) {
    if (left[index] !== right[index]) return left[index] - right[index];
  }
  return 0;
}

// The repo uses a plain `>=X.Y.Z` floor. An unrecognised shape is a contract
// change we want reported rather than silently skipped, so this returns null.
function parseNodeEngineFloor(range) {
  const match = /^>=\s*v?(\d+\.\d+\.\d+)$/.exec(String(range ?? "").trim());
  return match ? parseSemver(match[1]) : null;
}

function collectMarkdownFiles(directory) {
  const found = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const entryPath = join(directory, entry.name);
    if (entry.isDirectory()) {
      found.push(...collectMarkdownFiles(entryPath));
    } else if (entry.name.endsWith(".md")) {
      found.push(entryPath);
    }
  }
  return found;
}

// The Node floor lives in four places that nothing tied together: the
// `.node-version` pin, the root `engines.node` range, the base images that
// actually run production, and the prose that tells contributors what to
// install. They drifted apart once already — production containers stayed on an
// older patch line than the range the repo declared, so the shipped runtime
// quietly violated its own manifest. Asserting the relationship here keeps
// `.node-version` the single place a version change is made.
function assertRuntimeVersionContract(repoRoot) {
  const pinnedNode = parseSemver(readFileSync(join(repoRoot, ".node-version"), "utf8"));
  assert(pinnedNode, ".node-version must pin an X.Y.Z Node version.");

  const rootManifest = JSON.parse(readFileSync(join(repoRoot, "package.json"), "utf8"));
  const engineFloor = parseNodeEngineFloor(rootManifest.engines?.node);
  assert(
    engineFloor,
    `Root package.json engines.node must use the >=X.Y.Z form this check understands, found ${JSON.stringify(rootManifest.engines?.node)}.`,
  );
  assert(
    compareSemver(pinnedNode, engineFloor) >= 0,
    `.node-version (${pinnedNode.join(".")}) must satisfy engines.node (>=${engineFloor.join(".")}).`,
  );

  for (const dockerfilePath of ["apps/api/Dockerfile", "apps/worker/Dockerfile"]) {
    if (!existsSync(join(repoRoot, dockerfilePath))) continue;
    const source = readFileSync(join(repoRoot, dockerfilePath), "utf8");
    // Base images use a floating `major.minor` tag, matching the existing
    // `node:<major>.<minor>-alpine` convention, so the patch is not compared.
    for (const [, major, minor, patch] of source.matchAll(
      /^FROM node:(\d+)\.(\d+)(?:\.(\d+))?/gm,
    )) {
      const tag = [major, minor, patch ?? "0"].join(".");
      assert(
        Number(major) === pinnedNode[0] && Number(minor) === pinnedNode[1],
        `${dockerfilePath} must use the pinned Node ${pinnedNode[0]}.${pinnedNode[1]}.x line, found node:${major}.${minor}${patch ? `.${patch}` : ""}.`,
      );
      if (patch !== undefined) {
        const base = parseSemver(tag);
        assert(
          compareSemver(base, engineFloor) >= 0,
          `${dockerfilePath} builds production on Node ${tag}, which is below the engines.node floor of >=${engineFloor.join(".")}.`,
        );
      }
    }
  }

  const workflowsDir = join(repoRoot, ".github/workflows");
  if (existsSync(workflowsDir)) {
    for (const entry of readdirSync(workflowsDir)) {
      if (!entry.endsWith(".yml") && !entry.endsWith(".yaml")) continue;
      const source = readFileSync(join(workflowsDir, entry), "utf8");
      for (const [, version] of source.matchAll(/node-version:\s*["']?([^"'\s]+)/g)) {
        if (version.includes("${{")) continue;
        assert(
          version === pinnedNode.join("."),
          `.github/workflows/${entry} pins Node ${version}, but .node-version pins ${pinnedNode.join(".")}.`,
        );
      }
    }
  }

  // Prose check. Two deliberate limits keep it from firing on correct writing.
  //
  // A Node major below 16 is long end-of-life, so anything that low is skipped
  // rather than reported: it is far more likely to be an unrelated version in
  // the same breath (a pnpm pin, a package version) than a Node claim.
  //
  // Historical record directories are exempt because their whole job is to
  // describe what *was*. An acceptance-evidence section that quotes the stale
  // version it fixed is correct writing; flagging it would force the record to
  // stop naming the defect it documents.
  const historicalDocDirectories = [
    join(repoRoot, "docs/audits"),
    join(repoRoot, "docs/operations/releases"),
  ];
  const isHistoricalRecord = (docPath) =>
    historicalDocDirectories.some((directory) => docPath.startsWith(`${directory}/`));

  const docFiles = [
    join(repoRoot, "README.md"),
    ...collectMarkdownFiles(join(repoRoot, "docs")),
  ];
  for (const docPath of docFiles) {
    if (!existsSync(docPath) || isHistoricalRecord(docPath)) continue;
    const lines = readFileSync(docPath, "utf8").split("\n");
    lines.forEach((line, index) => {
      for (const match of line.matchAll(/[Nn]ode[^\n]{0,40}?(\d+\.\d+\.\d+)/g)) {
        const claimed = parseSemver(match[1]);
        if (!claimed || claimed[0] < 16) continue;
        assert(
          compareSemver(claimed, engineFloor) >= 0,
          `${docPath}:${index + 1} documents Node ${claimed.join(".")}, below the engines.node floor of >=${engineFloor.join(".")}.`,
        );
      }
    });
  }
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
    assertIncludes(
      deployWorkflowSource,
      "TURNSTILE_SECRET_KEY: ${{ secrets.TURNSTILE_SECRET_KEY }}",
      "Production API startup smoke must receive the required Turnstile secret.",
    );
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

  assertRuntimeVersionContract(repoRoot);

  process.stdout.write("Deployment contracts verified.\n");
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`Deployment contract check failed.\n${message}\n`);
  process.exit(1);
}
