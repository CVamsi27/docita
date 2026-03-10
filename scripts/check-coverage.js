#!/usr/bin/env node

/**
 * Coverage Threshold Checker
 * Validates that test coverage meets minimum thresholds
 */

const fs = require('fs');
const path = require('path');

const COVERAGE_FILE = path.join(__dirname, '../apps/api/coverage/coverage-summary.json');

// Define coverage thresholds
const THRESHOLDS = {
  lines: 80,
  statements: 80,
  functions: 80,
  branches: 75,
};

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

try {
  if (!fs.existsSync(COVERAGE_FILE)) {
    log(`⚠️  No coverage data found at ${COVERAGE_FILE}`, 'yellow');
    log('Skipping coverage check (coverage data not available)', 'yellow');
    process.exit(0);
  }

  const coverage = JSON.parse(fs.readFileSync(COVERAGE_FILE, 'utf8'));
  const total = coverage.total;

  log('\n📊 Coverage Report:\n', 'green');

  let allPass = true;
  const results = [];

  for (const [metric, threshold] of Object.entries(THRESHOLDS)) {
    const actual = total[metric]?.pct || 0;
    const status = actual >= threshold ? '✓' : '✗';
    const statusColor = actual >= threshold ? 'green' : 'red';
    
    results.push({
      metric: metric.charAt(0).toUpperCase() + metric.slice(1),
      actual,
      threshold,
      pass: actual >= threshold,
    });

    if (actual < threshold) {
      allPass = false;
    }

    log(`  ${status} ${metric.padEnd(12)}: ${actual.toFixed(2)}% (threshold: ${threshold}%)`, statusColor);
  }

  log('\n' + '='.repeat(50) + '\n', 'reset');

  if (allPass) {
    log('✓ All coverage thresholds met!', 'green');
    process.exit(0);
  } else {
    log('✗ Coverage thresholds not met:', 'red');
    results
      .filter(r => !r.pass)
      .forEach(r => {
        const gap = r.threshold - r.actual;
        log(`  - ${r.metric}: ${gap.toFixed(2)}% below threshold`, 'red');
      });
    process.exit(1);
  }
} catch (error) {
  log(`Error checking coverage: ${error.message}`, 'red');
  log('Coverage check failed', 'red');
  process.exit(1);
}
