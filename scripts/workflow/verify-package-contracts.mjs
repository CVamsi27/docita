#!/usr/bin/env node

import { access, readFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const logError = (message) => process.stderr.write(`${message}\n`);

const runtimePackages = [
  'data-access',
  'db',
  'hooks',
  'types',
  'ui',
  'utils',
];

async function exists(targetPath) {
  try {
    await access(targetPath, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function readJson(filePath) {
  const raw = await readFile(filePath, 'utf8');
  return JSON.parse(raw);
}

const errors = [];

for (const pkg of runtimePackages) {
  const pkgRoot = path.join(root, 'packages', pkg);
  const packageJsonPath = path.join(pkgRoot, 'package.json');
  const indexPath = path.join(pkgRoot, 'src', 'index.ts');

  if (!(await exists(packageJsonPath))) {
    errors.push(`packages/${pkg}/package.json is missing`);
    continue;
  }

  if (!(await exists(indexPath))) {
    errors.push(`packages/${pkg}/src/index.ts is missing`);
  }

  const manifest = await readJson(packageJsonPath);

  if (typeof manifest.name !== 'string' || !manifest.name.startsWith('@workspace/')) {
    errors.push(`packages/${pkg}/package.json must use @workspace/* name`);
  }

  const exportsField = manifest.exports;
  if (!exportsField || typeof exportsField !== 'object') {
    errors.push(`packages/${pkg}/package.json must define exports`);
    continue;
  }

  if (!Object.prototype.hasOwnProperty.call(exportsField, '.')) {
    errors.push(`packages/${pkg}/package.json exports must include "."`);
  }
}

if (errors.length > 0) {
  logError('Package contract violations detected:\n');
  for (const error of errors) {
    logError(` - ${error}`);
  }
  process.exit(1);
}
