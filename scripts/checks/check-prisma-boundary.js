#!/usr/bin/env node
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..', '..');
const log = (message) => process.stdout.write(`${message}\n`);
const error = (message) => process.stderr.write(`${message}\n`);

function listFiles() {
  const out = execSync('git ls-files', { cwd: repoRoot, encoding: 'utf8' });
  return out.split('\n').filter(Boolean);
}

const files = listFiles();

const prismaClientImportPattern =
  /from\s+['"]@prisma\/client['"]|require\(\s*['"]@prisma\/client['"]\s*\)/;
const workspaceDbImportPattern =
  /from\s+['"]@workspace\/db['"]|require\(\s*['"]@workspace\/db['"]\s*\)/;
const workspaceDbTokenPattern = /@workspace\/db/;
/**
 * PrismaService is the DI wrapper around the Prisma client. Importing it
 * into application/, presentation/, or websockets/ layers bypasses the
 * repository pattern just as cleanly as a raw `@prisma/client` import
 * would, so we ban it there too.
 *
 * Layer coverage (2026-08-07 survey): the gate now also scans layer
 * classes that were previously invisible — domain core/ services and
 * factories, strategy classes, domain-root and shared-module
 * cron/scheduler files, and the legacy top-level modules/ dir. The policy
 * comment already reserved core/ for "rare transaction interface" use;
 * this enforcement makes that real. The 29 existing files in these layers
 * are tracked in KNOWN_LEGACY_PRISMA_SERVICE_LEAKS below (survey debt,
 * mirrored after check-circular-deps KNOWN_CYCLES); NEW imports in any
 * covered layer fail CI immediately.
 *
 * Shared-module cron/scheduler and strategies/factories patterns are
 * nesting-tolerant ((?:[^/]+/)*) because a scheduler can live two levels
 * deep, e.g. messaging/admin-alerts/platform-health-alerts.scheduler.ts.
 * Test files (*.spec.ts) are excluded from the covered-layer check: they
 * construct PrismaService mocks, which is legitimate NestJS testing, not
 * a production persistence bypass.
 *
 * Allowed layers: infrastructure/ (where repositories live), repository
 * files wherever they sit (core/repositories/, shared module repos), and
 * shared/ tenant middleware / extensions that are not strategy, factory,
 * or cron/scheduler classes.
 */
const prismaServiceImportPattern =
  /from\s+['"]@\/prisma\/prisma\.service['"]/;

/**
 * Layer classes the boundary gate covers for PrismaService imports.
 * Anchored at apps/api/src so frontend/packages matches can't false-fire.
 */
const coveredLayerPatterns = [
  // Domain application/presentation/websockets (pre-existing coverage).
  /^apps\/api\/src\/domains\/[^/]+\/(application|presentation|websockets)\//,
  // Legacy top-level websockets/ gateways (survey 2026-08-08): the four
  // gateway files predate the domains/ layout; cover them so a future
  // PrismaService import here fails CI like any other covered layer.
  /^apps\/api\/src\/websockets\//,
  // Domain core/ — services, factories, domain-services (survey 2026-08-07).
  /^apps\/api\/src\/domains\/[^/]+\/core\//,
  // Domain strategy classes (survey 2026-08-07).
  /^apps\/api\/src\/domains\/[^/]+\/strategies\//,
  // Domain-root cron/scheduler files (survey 2026-08-07).
  /^apps\/api\/src\/domains\/[^/]+\/[^/]+\.(cron|scheduler)\.ts$/,
  // Legacy top-level modules/ dir (survey 2026-08-07).
  /^apps\/api\/src\/modules\//,
  // Shared-module strategy/factory classes (survey 2026-08-07).
  // Nesting-tolerant: matches any depth under the module dir.
  /^apps\/api\/src\/shared\/modules\/[^/]+\/(?:[^/]+\/)*(strategies|factories)\//,
  // Shared-module cron/scheduler files (survey 2026-08-07).
  // Nesting-tolerant: e.g. messaging/admin-alerts/platform-health-alerts.scheduler.ts.
  /^apps\/api\/src\/shared\/modules\/[^/]+\/(?:[^/]+\/)*[^/]+\.(cron|scheduler)\.ts$/,
];

/**
 * Existing PrismaService uses in covered layers, tracked as migration debt
 * from the 2026-08-07 survey (29 files). Each entry must migrate behind an
 * I*Repository seam; the gate blocks NEW imports in covered layers
 * immediately. Prune this list as files migrate — same pattern as
 * KNOWN_CYCLES in check-circular-deps.mjs. Keep sorted by path.
 */
const KNOWN_LEGACY_PRISMA_SERVICE_LEAKS = new Set([
  // WhatsApp — campaign dispatch cron; migrate behind whatsapp repository.
  'apps/api/src/domains/whatsapp/whatsapp-campaign-dispatch.cron.ts',
  // Shared compliance — retention scheduler.
  'apps/api/src/shared/modules/compliance/data-retention.scheduler.ts',
  // Shared ephemeral-store — cleanup scheduler.
  'apps/api/src/shared/modules/ephemeral-store/ephemeral-store-cleanup.scheduler.ts',
  // Shared imports — covered by IMPORT_STRATEGY_PERSISTENCE_PORT.
  // Shared messaging — platform health alerts scheduler (nested under
  // messaging/admin-alerts/; surfaced by the nesting-tolerant pattern).
  'apps/api/src/shared/modules/messaging/admin-alerts/platform-health-alerts.scheduler.ts',
  // Shared outbox — relay scheduler.
  'apps/api/src/shared/modules/outbox/outbox-relay.scheduler.ts',
  // Shared search — covered by SEARCH_STRATEGY_PERSISTENCE_PORT.
]);

const violations = [];
const prismaServiceLeaks = [];
const trackedLegacyLeaks = [];
const enforcePrismaService = process.argv.includes('--enforce-prisma-service');

// Scan list comes from `git ls-files`, so only tracked (committed or staged)
// files are inspected — a brand-new, never-staged file is invisible locally.
// CI runs on the committed tree, so the gate still bites there. Test files are
// skipped repo-wide: they construct PrismaService/@prisma/client mocks, which
// is legitimate NestJS testing, not a production persistence bypass.
for (const file of files) {
  if (file.startsWith('node_modules/') || file.includes('/dist/') || file.includes('.next/') || file.includes('/test-utils/') || file.endsWith('.spec.ts') || file.endsWith('.tsbuildinfo') || file.endsWith('.js.map') || file.endsWith('.md') || file === 'pnpm-lock.yaml' || file === 'scripts/checks/check-prisma-boundary.js') continue;
  const full = path.join(repoRoot, file);
  let content;
  try {
    content = fs.readFileSync(full, 'utf8');
  } catch (e) {
    continue;
  }

  if (prismaClientImportPattern.test(content)) {
    const allowed =
      file.startsWith('packages/db/') ||
      file.startsWith('apps/api/src/prisma/') ||
      file.startsWith('apps/api/prisma/') ||
      (file.startsWith('apps/api/src/') &&
        (file.includes('/infrastructure/') || file.includes('/repositories/')));

    if (!allowed) {
      violations.push({
        file,
        reason:
          "@prisma/client used outside packages/db or API repository layer boundaries",
      });
    }
  }

  if (workspaceDbImportPattern.test(content)) {
    const allowed =
      file.startsWith('packages/db/') ||
      file.startsWith('apps/api/') ||
      file.startsWith('scripts/') ||
      file.startsWith('docs/');

    if (!allowed) {
      if (file.startsWith('packages/types/')) {
        violations.push({file, reason: "@workspace/db imported inside packages/types (types must be DB-agnostic)"});
      } else      if (
        file.startsWith('apps/app/') ||
        file.startsWith('apps/internal/') ||
        file.startsWith('apps/landing/')
      ) {
        violations.push({file, reason: "@workspace/db imported in frontend code (frontend must remain DB-agnostic)"});
      } else {
        violations.push({file, reason: "@workspace/db used outside backend boundaries (allowed: apps/api, packages/db, scripts)"});
      }
    }
  }

  if (prismaServiceImportPattern.test(content)) {
    const isApi = file.startsWith('apps/api/src/');
    const inRepositoryFile =
      file.includes('/infrastructure/') || file.includes('/repositories/');
    const inCoveredLayer =
      isApi &&
      !inRepositoryFile &&
      coveredLayerPatterns.some((pattern) => pattern.test(file));
    if (inCoveredLayer) {
      if (KNOWN_LEGACY_PRISMA_SERVICE_LEAKS.has(file)) {
        // Tracked migration debt (survey 2026-08-07): report, don't fail.
        trackedLegacyLeaks.push(file);
      } else {
        // New leak in a covered layer: warn, and fail under
        // --enforce-prisma-service.
        prismaServiceLeaks.push(file);
      }
    }
  }

  const isFrontendConfigFile =
    (file === 'apps/app/package.json' ||
      file === 'apps/app/tsconfig.json' ||
      file === 'apps/internal/package.json' ||
      file === 'apps/internal/tsconfig.json' ||
      file === 'apps/landing/package.json' ||
      file === 'apps/landing/tsconfig.json');

  if (isFrontendConfigFile && workspaceDbTokenPattern.test(content)) {
    violations.push({
      file,
      reason:
        "@workspace/db referenced in frontend config (frontend must not depend on DB package)",
    });
  }
}

if (violations.length === 0) {
  log('OK: No boundary violations found');
  if (trackedLegacyLeaks.length > 0) {
    log('');
    log(
      `INFO: ${trackedLegacyLeaks.length} tracked legacy PrismaService uses in covered layers (2026-08-07 survey; see KNOWN_LEGACY_PRISMA_SERVICE_LEAKS).`,
    );
    log(
      'Migrate these behind I*Repository seams per §15.1, then prune the allowlist. New imports in covered layers fail the gate.',
    );
  }
  if (prismaServiceLeaks.length > 0) {
    log('');
    log(
      `WARN: ${prismaServiceLeaks.length} file(s) import PrismaService in covered layers (application, presentation, websockets, core, strategies, cron/scheduler, legacy modules).`,
    );
    log(
      'These should migrate behind I*Repository interfaces per §15.1. Run with --enforce-prisma-service to fail CI on these.',
    );
    if (enforcePrismaService) {
      for (const f of prismaServiceLeaks) error(` - ${f}`);
      process.exit(2);
    }
  }
  process.exit(0);
}

error('Prisma boundary violations detected:\n');
for (const v of violations) {
  error(` - ${v.file}: ${v.reason}`);
}

process.exit(2);
