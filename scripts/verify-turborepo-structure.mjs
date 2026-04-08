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
  'apps/app/tests/unit',
  'apps/app/tests/integration',
  'apps/app/tests/e2e',
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
  'packages/auth',
  'packages/utils',
  'packages/eslint-config',
  'packages/typescript-config',
  'packages/auth/src',
  'packages/auth/src/index.ts',
  'packages/auth/tests/unit',
  'packages/auth/tests/integration',
  'packages/data-access/src',
  'packages/data-access/src/index.ts',
  'packages/data-access/tests/unit',
  'packages/data-access/tests/integration',
  'packages/db/src',
  'packages/db/src/index.ts',
  'packages/db/tests/unit',
  'packages/db/tests/integration',
  'packages/hooks/src',
  'packages/hooks/src/index.ts',
  'packages/hooks/tests/unit',
  'packages/hooks/tests/integration',
  'packages/types/src',
  'packages/types/src/index.ts',
  'packages/types/tests/unit',
  'packages/types/tests/integration',
  'packages/ui/src',
  'packages/ui/src/index.ts',
  'packages/ui/tests/unit',
  'packages/ui/tests/integration',
  'packages/utils/src',
  'packages/utils/src/index.ts',
  'packages/utils/tests/unit',
  'packages/utils/tests/integration',
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

  }
  process.exit(1);
}
