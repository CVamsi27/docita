#!/usr/bin/env node

import { execSync } from 'node:child_process';

const command =
  "rg -n \"console\\.(log|error|warn|info|debug)\" apps packages " +
  "--glob '!**/*.spec.ts' " +
  "--glob '!**/*.test.ts' " +
  "--glob '!**/test/**' " +
  "--glob '!**/e2e/**' " +
  "--glob '!apps/app/lib/logger.ts' " +
  "--glob '!**/node_modules/**'";

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
