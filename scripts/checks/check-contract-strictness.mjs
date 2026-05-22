#!/usr/bin/env node

import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(fileURLToPath(new URL('.', import.meta.url)), '..', '..');
const log = (message) => process.stdout.write(`${message}\n`);
const error = (message) => process.stderr.write(`${message}\n`);

/**
 * Goal: enforce that shared contract schemas do not allow unexpected keys.
 *
 * We are strict about API payload shapes to prevent overfetch, contract drift,
 * and unwanted traffic. Unknown keys should be rejected at the boundary.
 */

const contractsRoot = 'packages/types/src/contracts';
const trackedFiles = execSync(`git ls-files -- "${contractsRoot}"`, {
  encoding: 'utf8',
})
  .split('\n')
  .filter(Boolean);

const forbidden = [
  {
    pattern: /\.passthrough\s*\(\s*\)/g,
    reason:
      'Contract schemas must not allow unknown keys. Use .strict() (preferred) or explicitly model fields.',
  },
  {
    pattern: /\.nonstrict\s*\(\s*\)/g,
    reason:
      'Contract schemas must not allow unknown keys. Use .strict() (preferred) or explicitly model fields.',
  },
  {
    pattern: /\.catchall\s*\(/g,
    reason:
      'Contract schemas must not allow unknown keys. Model fields explicitly or use a dedicated metadata property.',
  },
];

/**
 * Temporary allowlist for cases where permissive schemas are used for backward
 * compatibility. Keep this list small and remove entries as contracts harden.
 */
const allowlist = new Set([
  // Example: 'packages/types/src/contracts/legacy/some-route.ts',
]);

const violations = [];

for (const relPath of trackedFiles) {
  if (allowlist.has(relPath)) continue;

  const fullPath = resolve(repoRoot, relPath);
  if (!existsSync(fullPath)) continue;

  const content = readFileSync(fullPath, 'utf8');
  for (const { pattern, reason } of forbidden) {
    pattern.lastIndex = 0;
    if (pattern.test(content)) {
      violations.push({ relPath, reason });
    }
  }
}

if (violations.length > 0) {
  error('Contract strictness check failed.\n');
  for (const violation of violations) {
    error(` - ${violation.relPath}: ${violation.reason}`);
  }
  error(
    '\nFix by removing passthrough/nonstrict/catchall usage and tightening schemas.',
  );
  process.exit(1);
}

log('Contract strictness check passed.');

