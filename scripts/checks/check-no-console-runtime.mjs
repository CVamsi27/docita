#!/usr/bin/env node

import { execSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const command =
  "rg -n \"console\\.(log|error|warn|info|debug)\" apps packages " +
  "--glob '!**/*.spec.ts' " +
  "--glob '!**/*.test.ts' " +
  "--glob '!**/test/**' " +
  "--glob '!**/e2e/**' " +
  "--glob '!apps/app/lib/logger.ts' " +
  "--glob '!apps/api/scripts/**' " +
  "--glob '!**/.wrangler/**' " +
  "--glob '!**/node_modules/**'";

const matcher = /console\.(log|error|warn|info|debug)/;
const SOURCE_ROOTS = ['apps', 'packages'];
const EXCLUDED_FILE_SUFFIXES = ['.spec.ts', '.test.ts'];
const EXCLUDED_PATH_SEGMENTS = [
  '/test/',
  '/e2e/',
  '/node_modules/',
  '/.next/',
  '/.open-next/',
  '/.wrangler/',
  '/dist/',
  '/build/',
  '/out/',
  '/coverage/',
  '/test-results/',
  '/playwright-report/',
];
const EXCLUDED_PATH_PREFIXES = ['apps/api/scripts/'];
const EXCLUDED_FILES = new Set(['apps/app/lib/logger.ts']);
const SOURCE_EXTENSIONS = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
]);

const hasRipgrep = isCommandAvailable('rg');

if (!hasRipgrep) {
  process.stdout.write(
    'rg not found; falling back to built-in no-console scanner.\n',
  );

  const findings = scanForConsoleUsage();
  reportAndExit(findings);
}

try {
  const output = execSync(command, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();

  const findings = output
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  if (findings.length > 0) {
    process.stderr.write('Runtime no-console check failed.\n');
    process.stderr.write(
      'Use NestJS Logger in backend and app logger utility in frontend.\n\n',
    );
    for (const finding of findings) {
      process.stderr.write(` - ${finding}\n`);
    }
    process.exit(1);
  }
} catch (error) {
  if (error && typeof error === 'object' && 'status' in error) {
    const status = Number(error.status);
    if (status === 1) {
      process.stdout.write('Runtime no-console check passed.\n');
      process.exit(0);
    }
  }

  throw error;
}

process.stdout.write('Runtime no-console check passed.\n');

function isCommandAvailable(commandName) {
  try {
    execSync(`${commandName} --version`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function scanForConsoleUsage() {
  const findings = [];
  const files = SOURCE_ROOTS.flatMap((root) => listSourceFiles(root));

  for (const filePath of files) {
    const contents = readFileSync(filePath, 'utf8');
    const lines = contents.split('\n');

    for (let index = 0; index < lines.length; index += 1) {
      if (!matcher.test(lines[index])) {
        continue;
      }
      findings.push(
        `${normalizePath(filePath)}:${index + 1}:${lines[index].trim()}`,
      );
    }
  }

  return findings;
}

function listSourceFiles(directory) {
  const entries = readdirSync(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...listSourceFiles(fullPath));
      continue;
    }
    if (!entry.isFile()) {
      continue;
    }

    const normalizedPath = normalizePath(fullPath);
    if (EXCLUDED_FILES.has(normalizedPath)) {
      continue;
    }
    if (EXCLUDED_PATH_PREFIXES.some((prefix) => normalizedPath.startsWith(prefix))) {
      continue;
    }
    if (EXCLUDED_PATH_SEGMENTS.some((segment) => normalizedPath.includes(segment))) {
      continue;
    }
    if (EXCLUDED_FILE_SUFFIXES.some((suffix) => normalizedPath.endsWith(suffix))) {
      continue;
    }
    if (!hasAllowedExtension(normalizedPath)) {
      continue;
    }

    files.push(fullPath);
  }

  return files;
}

function hasAllowedExtension(filePath) {
  const lastDot = filePath.lastIndexOf('.');
  if (lastDot === -1) {
    return false;
  }
  const extension = filePath.slice(lastDot);
  return SOURCE_EXTENSIONS.has(extension);
}

function normalizePath(filePath) {
  return relative(process.cwd(), filePath).split('\\').join('/');
}

function reportAndExit(findings) {
  if (findings.length > 0) {
    process.stderr.write('Runtime no-console check failed.\n');
    process.stderr.write(
      'Use NestJS Logger in backend and app logger utility in frontend.\n\n',
    );
    for (const finding of findings) {
      process.stderr.write(` - ${finding}\n`);
    }
    process.exit(1);
  }

  process.stdout.write('Runtime no-console check passed.\n');
  process.exit(0);
}
