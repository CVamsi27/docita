#!/usr/bin/env node

import { access } from 'node:fs/promises';
import { constants } from 'node:fs';
import path from 'node:path';

const root = process.cwd();

const requiredPaths = [
  'apps',
  'apps/app',
  'apps/internal',
  'apps/landing',
  'apps/api',
  'apps/worker',
  'apps/worker/src',
  'apps/app/e2e',
  'apps/internal/tests/unit',
  'apps/internal/tests/integration',
  'apps/internal/tests/e2e',
  'apps/landing/src',
  'apps/landing/public',
  'apps/landing/e2e',
  'apps/api/test/unit',
  'apps/api/test/integration',
  'apps/api/test/e2e',
  'packages',
  'packages/ui',
  'packages/types',
  'packages/db',
  'packages/data-access',
  'packages/utils',
  'packages/eslint-config',
  'packages/typescript-config',
  'packages/data-access/src',
  'packages/data-access/src/index.ts',
  'packages/db/src',
  'packages/db/src/index.ts',
  'packages/hooks/src',
  'packages/hooks/src/index.ts',
  'packages/types/src',
  'packages/types/src/index.ts',
  'packages/ui/src',
  'packages/ui/src/index.ts',
  'packages/utils/src',
  'packages/utils/src/index.ts',
  'docs',
  'scripts',
];

async function exists(target) {
  try {
    await access(path.join(root, target), constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

const missing = [];
for (const target of requiredPaths) {

  if (!(await exists(target))) {
    missing.push(target);
  }
}

if (missing.length > 0) {
  for (const target of missing) {
    console.error(`Missing required repository path: ${target}`);
  }
  process.exit(1);
}
