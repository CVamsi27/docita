#!/usr/bin/env node

/**
 * Migration Safety Check
 *
 * Scans the latest migration SQL for patterns that could cause downtime under
 * the expand/contract pattern. Flags operations that should be split into
 * separate deploy phases.
 *
 * Usage: node scripts/checks/check-migration-safety.mjs
 * Exit code: 0 (pass) or 1 (fail)
 */

import { readFileSync, readdirSync } from 'fs';
import { join, resolve } from 'path';
import { execSync } from 'child_process';

const MIGRATIONS_DIR = resolve(import.meta.dirname, '../../packages/db/prisma/migrations');

const DANGEROUS_PATTERNS = [
  {
    pattern: /ALTER\s+TABLE.*DROP\s+COLUMN/i,
    message: 'DROP COLUMN is a contract phase — should be deployed AFTER all readers have been updated',
    level: 'error',
  },
  {
    pattern: /ALTER\s+TABLE.*ALTER\s+COLUMN.*TYPE/i,
    message: 'ALTER COLUMN TYPE may lock the table — consider USING clause or split into expand→migrate→contract',
    level: 'error',
  },
  {
    pattern: /ALTER\s+TABLE.*ADD\s+.*NOT\s+NULL/i,
    message: 'ADD NOT NULL requires a DEFAULT or backfill FIRST when adding a new column',
    level: 'warning',
  },
  {
    pattern: /ALTER\s+TABLE.*RENAME\s+COLUMN/i,
    message: 'RENAME COLUMN is a contract phase — deploy AFTER all writers have been updated',
    level: 'error',
  },
  {
    pattern: /ALTER\s+TABLE.*RENAME\s+TO/i,
    message: 'RENAME TABLE is a contract phase — deploy AFTER all writers have been updated',
    level: 'error',
  },
  {
    pattern: /CREATE\s+INDEX\s+CONCURRENTLY/i,
    message: 'CREATE INDEX CONCURRENTLY is preferred for large tables over blocking CREATE INDEX',
    level: 'info',
  },
  {
    pattern: /CREATE\s+INDEX(?!\s+CONCURRENTLY)/i,
    message: 'CREATE INDEX (non-concurrent) may lock writes on large tables — prefer CREATE INDEX CONCURRENTLY',
    level: 'warning',
  },
  {
    pattern: /DROP\s+INDEX/i,
    message: 'DROP INDEX should be deployed AFTER confirming no queries reference it',
    level: 'warning',
  },
  {
    pattern: /LOCK\s+TABLE/i,
    message: 'Explicit LOCK TABLE may cause downtime under load',
    level: 'error',
  },
  {
    pattern: /SET\s+session_replication_role/i,
    message: 'Setting session_replication_role is dangerous and may break FK enforcement',
    level: 'error',
  },
];

function getLatestMigrationDir() {
  const dirs = readdirSync(MIGRATIONS_DIR)
    .filter((d) => /^\d{14}_/.test(d))
    .sort()
    .reverse();

  if (dirs.length === 0) {
    console.error('No migration directories found');
    process.exit(1);
  }

  return join(MIGRATIONS_DIR, dirs[0]);
}

function main() {
  const migrationDir = getLatestMigrationDir();
  const sqlFiles = readdirSync(migrationDir).filter((f) => f.endsWith('.sql'));

  let hasError = false;
  let hasWarning = false;

  console.log(`\nChecking migration: ${migrationDir.split('/').pop()}\n`);

  for (const file of sqlFiles) {
    const content = readFileSync(join(migrationDir, file), 'utf-8');
    const lines = content.split('\n');

    for (const { pattern, message, level } of DANGEROUS_PATTERNS) {
      for (let i = 0; i < lines.length; i++) {
        if (pattern.test(lines[i])) {
          const prefix = level === 'error' ? '❌' : level === 'warning' ? '⚠️' : 'ℹ️';
          console.log(`  ${prefix} [${level.toUpperCase()}] ${file}:${i + 1}`);
          console.log(`      ${message}`);
          console.log(`      ${lines[i].trim().slice(0, 120)}`);

          if (level === 'error') hasError = true;
          if (level === 'warning') hasWarning = true;
        }
      }
    }
  }

  if (hasError) {
    console.log(`\n❌ Found potential breaking changes in migration. Review flagged statements and split into expand/contract phases.\n`);
    process.exit(1);
  }

  if (hasWarning) {
    console.log(`\n⚠️ Found warnings — review for safety but not blocking.\n`);
  } else {
    console.log(`\n✅ Migration looks safe for zero-downtime deploy.\n`);
  }

  process.exit(0);
}

main();
