#!/usr/bin/env node
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');

function listFiles() {
  const out = execSync('git ls-files', { cwd: repoRoot, encoding: 'utf8' });
  return out.split('\n').filter(Boolean);
}

const files = listFiles();

const prismaClientPattern = /@prisma\/client/;
const workspaceDbPattern = /@workspace\/db/;

const violations = [];

for (const file of files) {
  if (file.startsWith('node_modules/') || file.includes('/dist/') || file.includes('.next/') || file.endsWith('.tsbuildinfo') || file.endsWith('.js.map') || file.endsWith('.md') || file === 'pnpm-lock.yaml') continue;
  const full = path.join(repoRoot, file);
  let content;
  try {
    content = fs.readFileSync(full, 'utf8');
  } catch (e) {
    continue;
  }

  if (prismaClientPattern.test(content)) {
    const allowed = file.startsWith('packages/db/') || file.startsWith('apps/api/infrastructure/') || file.startsWith('apps/api/src/prisma/') || file.startsWith('apps/api/prisma/');
    if (!allowed) violations.push({file, reason: "@prisma/client used outside packages/db or apps/api/infrastructure"});
  }

  if (workspaceDbPattern.test(content)) {
    // disallow @workspace/db imports inside packages/types
    if (file.startsWith('packages/types/')) {
      violations.push({file, reason: "@workspace/db imported inside packages/types (types must be DB-agnostic)"});
    }
  }
}

if (violations.length === 0) {
  console.log('OK: No boundary violations found');
  process.exit(0);
}

console.error('Prisma boundary violations detected:\n');
for (const v of violations) {
  console.error(` - ${v.file}: ${v.reason}`);
}

process.exit(2);
