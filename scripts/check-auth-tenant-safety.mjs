#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(fileURLToPath(new URL('.', import.meta.url)), '..');
const log = (message) => process.stdout.write(`${message}\n`);
const error = (message) => process.stderr.write(`${message}\n`);

const preTenantAuthFiles = [
  'apps/api/src/shared/modules/auth/auth/jwt.strategy.ts',
  'apps/api/src/shared/modules/auth/guards/password-expired.guard.ts',
  'apps/api/src/shared/modules/auth/guards/email-verified.guard.ts',
];

const forbiddenPatterns = [
  {
    pattern: /\bthis\.prisma\.user\.(findUnique|findFirst|findMany|update|updateMany|create|delete)\s*\(/g,
    reason:
      'Direct Prisma User-model access is not allowed in pre-tenant auth pipeline files.',
  },
  {
    pattern: /\bthis\.prisma\.runUnrestricted\s*\(\s*(?:async\s*)?\(\s*\)\s*=>\s*this\.prisma\.user\./g,
    reason:
      'Lazy User Prisma promises inside runUnrestricted can escape tenant bypass context.',
  },
];

const violations = [];

for (const relPath of preTenantAuthFiles) {
  const fullPath = resolve(repoRoot, relPath);
  const content = readFileSync(fullPath, 'utf8');

  for (const { pattern, reason } of forbiddenPatterns) {
    pattern.lastIndex = 0;
    if (pattern.test(content)) {
      violations.push({ relPath, reason });
    }
  }
}

if (violations.length > 0) {
  error('Auth tenant-safety check failed.\n');
  for (const violation of violations) {
    error(` - ${violation.relPath}: ${violation.reason}`);
  }
  process.exit(1);
}

const trackedFiles = execSync('git ls-files "apps/api/src/**/*.ts"', {
  encoding: 'utf8',
})
  .split('\n')
  .filter(Boolean);

for (const relPath of trackedFiles) {
  const fullPath = resolve(repoRoot, relPath);
  if (!existsSync(fullPath)) {
    continue;
  }
  const content = readFileSync(fullPath, 'utf8');

  if (/runUnrestricted\(\s*\(\)\s*=>/.test(content)) {
    violations.push({
      relPath,
      reason:
        'runUnrestricted callback must be async to avoid lazy Prisma promise context leakage.',
    });
  }
}

if (violations.length > 0) {
  error('Auth tenant-safety check failed.\n');
  for (const violation of violations) {
    error(` - ${violation.relPath}: ${violation.reason}`);
  }
  process.exit(1);
}

log('Auth tenant-safety check passed.');
