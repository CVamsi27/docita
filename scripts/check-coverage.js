#!/usr/bin/env node

/**
 * Coverage Threshold Check Script
 * Verifies that test coverage meets minimum thresholds
 */

const fs = require('fs');
const path = require('path');

const THRESHOLDS = {
  lines: 80,
  statements: 80,
  functions: 80,
  branches: 75,
};

const COVERAGE_FILE = path.join(
  __dirname,
  '../apps/api/coverage/coverage-summary.json',
);

try {
  if (!fs.existsSync(COVERAGE_FILE)) {
    console.error(' Coverage file not found:', COVERAGE_FILE);
    process.exit(1);
  }

  const coverage = JSON.parse(fs.readFileSync(COVERAGE_FILE, 'utf8'));
  const total = coverage.total;

  console.log('\n Coverage Report\n');
  console.log('Metric          | Current | Target | Status');
  console.log('----------------|---------|--------|--------');

  let allPassed = true;

  Object.entries(THRESHOLDS).forEach(([metric, threshold]) => {
    const current = total[metric].pct;
    const passed = current >= threshold;
    const status = passed ? ' PASS' : ' FAIL';

    if (!passed) {
      allPassed = false;
    }

    console.log(
      `${metric.padEnd(16)}| ${current.toFixed(2).padStart(6)}% | ${threshold.toFixed(2).padStart(6)}% | ${status}`,
    );
  });

  console.log('');

  if (!allPassed) {
    console.error(' Coverage thresholds not met!');
    console.error('\nTo improve coverage, add unit tests for:');
    console.error('  - Uncovered service methods');
    console.error('  - Error handling paths');
    console.error('  - Edge cases and validations');
    process.exit(1);
  } else {
    console.log(' All coverage thresholds met!\n');
    process.exit(0);
  }
} catch (error) {
  console.error(' Error checking coverage:', error.message);
  process.exit(1);
}
