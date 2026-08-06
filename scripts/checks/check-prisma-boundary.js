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
 * into application/ or presentation/ layers bypasses the repository pattern
 * just as cleanly as a raw `@prisma/client` import would, so we ban it
 * there too. Allowed layers: core/ (rare — for transaction interface),
 * infrastructure/ (where repositories live), and shared/ (for tenant
 * middleware / extensions).
 */
const prismaServiceImportPattern =
  /from\s+['"]@\/prisma\/prisma\.service['"]/;

const violations = [];
const prismaServiceLeaks = [];
const enforcePrismaService = process.argv.includes('--enforce-prisma-service');

for (const file of files) {
  if (file.startsWith('node_modules/') || file.includes('/dist/') || file.includes('.next/') || file.includes('/test-utils/') || file.endsWith('.tsbuildinfo') || file.endsWith('.js.map') || file.endsWith('.md') || file === 'pnpm-lock.yaml' || file === 'scripts/checks/check-prisma-boundary.js') continue;
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
      file.startsWith('scripts/');

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
    const inForbiddenLayer =
      isApi &&
      (file.includes('/application/') ||
        file.includes('/presentation/')) &&
      !file.includes('/infrastructure/');
    if (inForbiddenLayer) {
      prismaServiceLeaks.push(file);
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
  if (prismaServiceLeaks.length > 0) {
    log('');
    log(
      `WARN: ${prismaServiceLeaks.length} file(s) import PrismaService in application/ or presentation/ layers.`,
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
