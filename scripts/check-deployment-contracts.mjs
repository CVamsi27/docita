#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const repoRoot = process.cwd();

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

try {
  const appMiddleware = "apps/app/middleware.ts";
  const internalMiddleware = "apps/internal/middleware.ts";
  const deployWorkflowPath = ".github/workflows/deploy.yml";
  const detectScopePath = "scripts/detect-workflow-scope.mjs";
  const appLayoutPath = "apps/app/app/layout.tsx";

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

  assertIncludes(
    appMiddlewareSource,
    "export function middleware",
    "apps/app/middleware.ts must export middleware().",
  );
  assertIncludes(
    internalMiddlewareSource,
    "export function middleware",
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
    '"scripts/detect-workflow-scope.mjs"',
    '"scripts/test-api-startup.sh"',
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
    'file === "scripts/detect-workflow-scope.mjs"',
    'file === "scripts/test-api-startup.sh"',
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

  process.stdout.write("Deployment contracts verified.\n");
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`Deployment contract check failed.\n${message}\n`);
  process.exit(1);
}
