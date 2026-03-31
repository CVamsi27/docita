#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const hardcodedColorPatterns = [
  /\b(bg|text|border)-(red|green|blue|yellow|amber|purple|pink|gray|slate|zinc|neutral|stone|orange|lime|emerald|teal|cyan|sky|indigo|violet|fuchsia|rose)-(50|100|200|300|400|500|600|700|800|900|950)\b/g,
];

const excludeDirs = new Set([
  'node_modules',
  'dist',
  '.next',
  'coverage',
  'build',
  '.turbo',
  '.git',
  '.open-next',
  'out',
  '.vercel',
  '.cache',
]);

function getAllFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);

  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      if (!excludeDirs.has(file)) {
        getAllFiles(filePath, fileList);
      }
    } else if (/\.(ts|tsx|js|jsx)$/.test(file)) {
      fileList.push(filePath);
    }
  });

  return fileList;
}

const filesToScan = getAllFiles(process.cwd());

const violations = [];

filesToScan.forEach(file => {
  const relativeFile = path.relative(process.cwd(), file);
  if (relativeFile === 'scripts/detect-hardcoded-colors.js') {
    return;
  }

  const content = fs.readFileSync(file, 'utf-8');
  const lines = content.split('\n');

  lines.forEach((line, index) => {
    hardcodedColorPatterns.forEach(pattern => {
      const matches = line.match(pattern);
      if (matches) {
        violations.push({
          file: relativeFile,
          line: index + 1,
          content: line.trim(),
          matches: [...new Set(matches)],
        });
      }
    });
  });
});

console.log('\n=================================================');
console.log('Hardcoded Color Detection Report');
console.log('=================================================\n');

if (violations.length === 0) {
  console.log('No hardcoded color violations found!\n');
  console.log('All code is using semantic design tokens.\n');
  process.exit(0);
}

console.log(`Found ${violations.length} hardcoded color violation(s):\n`);

const violationsByFile = violations.reduce((acc, v) => {
  if (!acc[v.file]) {
    acc[v.file] = [];
  }
  acc[v.file].push(v);
  return acc;
}, {});

Object.entries(violationsByFile).forEach(([file, fileViolations]) => {
  console.log(`File: ${file}`);
  fileViolations.forEach(v => {
    console.log(`   Line ${v.line}: ${v.content}`);
    console.log(`   Found: ${v.matches.join(', ')}`);
    console.log('');
  });
});

console.log('=================================================');
console.log('How to Fix:');
console.log('=================================================\n');
console.log('Replace hardcoded Tailwind colors with semantic design tokens:');
console.log('');
console.log('BEFORE: bg-green-100 text-green-700');
console.log('AFTER:  badge-success');
console.log('');
console.log('BEFORE: bg-red-500');
console.log('AFTER:  bg-destructive');
console.log('');
console.log('BEFORE: text-blue-600');
console.log('AFTER:  text-info');
console.log('');
console.log('See packages/ui/docs/color-system.md for complete guide.');
console.log('');

process.exit(1);
