const fs = require('fs');
const path = require('path');

function numberFromEnv(name, fallback) {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function readSummary(filePath) {
  const absolutePath = path.resolve(filePath);
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Summary file not found: ${absolutePath}`);
  }

  return JSON.parse(fs.readFileSync(absolutePath, 'utf8'));
}

function main() {
  const summaryPath =
    process.argv[2] || 'logs/performance/k6-baseline-summary-2026-02-16.json';

  const thresholds = {
    p95Ms: numberFromEnv('PERF_P95_MS', 500),
    p99Ms: numberFromEnv('PERF_P99_MS', 1000),
    reqFailedRate: numberFromEnv('PERF_FAILED_RATE', 0.1),
    minRps: numberFromEnv('PERF_MIN_RPS', 5),
  };

  const summary = readSummary(summaryPath);
  const metrics = summary.metrics || {};

  const durationMetric = metrics.http_req_duration || {};
  const p95 = durationMetric['p(95)'] ?? Infinity;
  const p99 =
    durationMetric['p(99)'] ??
    durationMetric.max ??
    p95;
  const failedRate = metrics.http_req_failed?.value ?? 0;
  const rps = metrics.http_reqs?.rate ?? 0;

  const checks = [
    {
      name: 'p95 latency',
      pass: p95 <= thresholds.p95Ms,
      detail: `${p95.toFixed(2)}ms <= ${thresholds.p95Ms}ms`,
    },
    {
      name: 'p99 latency',
      pass: p99 <= thresholds.p99Ms,
      detail: `${p99.toFixed(2)}ms <= ${thresholds.p99Ms}ms`,
    },
    {
      name: 'failed request rate',
      pass: failedRate <= thresholds.reqFailedRate,
      detail: `${(failedRate * 100).toFixed(2)}% <= ${(thresholds.reqFailedRate * 100).toFixed(2)}%`,
    },
    {
      name: 'request throughput',
      pass: rps >= thresholds.minRps,
      detail: `${rps.toFixed(2)} req/s >= ${thresholds.minRps} req/s`,
    },
  ];

  console.log(`Performance regression check for: ${summaryPath}`);
  for (const check of checks) {
    console.log(`${check.pass ? 'PASS' : 'FAIL'} ${check.name}: ${check.detail}`);
  }

  const hasFailure = checks.some((check) => !check.pass);
  if (hasFailure) {
    process.exit(1);
  }
}

main();
