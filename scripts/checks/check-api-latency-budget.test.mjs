import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

/**
 * Regression suite for the API latency budget gate (backlog R02).
 *
 * The required-baseline mode is the release gate for a release that declares
 * an API performance budget. These tests pin its failure semantics: absent,
 * stale, provenance-less, incomplete and over-budget evidence must all fail,
 * while a fresh compliant sample passes. The optional developer mode must
 * keep skipping on absence so `verify:standard` stays usable before a
 * staging soak has been captured.
 */
const scriptPath = fileURLToPath(
  new URL("./check-api-latency-budget.mjs", import.meta.url),
);
const fixtureDir = mkdtempSync(path.join(os.tmpdir(), "api-latency-budget-"));
const MS_PER_DAY = 24 * 60 * 60 * 1000;

test.after(() => {
  rmSync(fixtureDir, { recursive: true, force: true });
});

function baselineJson({
  generatedAt = new Date().toISOString(),
  endpoints = {},
} = {}) {
  return {
    generatedAt,
    source: "test-soak.json",
    endpoints: {
      auth: { p95: 120 },
      crud: { p95: 150, p99: 400 },
      search: { p95: 200 },
      reports: { p95: 900 },
      webhooks: { p95: 40 },
      ...endpoints,
    },
  };
}

function writeFixture(name, contents) {
  const filePath = path.join(fixtureDir, name);
  writeFileSync(
    filePath,
    typeof contents === "string"
      ? contents
      : `${JSON.stringify(contents, null, 2)}\n`,
  );
  return filePath;
}

function runCheck(args) {
  return spawnSync(process.execPath, [scriptPath, ...args], {
    encoding: "utf8",
  });
}

test("optional check skips when the baseline is absent", () => {
  const result = runCheck(["--baseline", path.join(fixtureDir, "missing.json")]);

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /skipped/i);
});

test("required check fails when the baseline is absent", () => {
  const result = runCheck([
    "--baseline",
    path.join(fixtureDir, "missing.json"),
    "--require-baseline",
  ]);

  assert.equal(result.status, 1);
  assert.match(result.stderr, /no baseline/i);
});

test("required check passes a fresh compliant baseline", () => {
  const baseline = writeFixture("compliant.json", baselineJson());
  const result = runCheck(["--baseline", baseline, "--require-baseline"]);

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /passed/);
});

test("required check fails a stale baseline", () => {
  const baseline = writeFixture(
    "stale.json",
    baselineJson({
      generatedAt: new Date(Date.now() - 45 * MS_PER_DAY).toISOString(),
    }),
  );
  const result = runCheck(["--baseline", baseline, "--require-baseline"]);

  assert.equal(result.status, 1);
  assert.match(result.stderr, /stale/i);
});

test("required check honours an explicit --max-age-days", () => {
  const baseline = writeFixture(
    "stale-within-window.json",
    baselineJson({
      generatedAt: new Date(Date.now() - 45 * MS_PER_DAY).toISOString(),
    }),
  );
  const result = runCheck([
    "--baseline",
    baseline,
    "--require-baseline",
    "--max-age-days",
    "60",
  ]);

  assert.equal(result.status, 0, result.stderr);
});

test("required check rejects an invalid --max-age-days", () => {
  const baseline = writeFixture("compliant-max-age.json", baselineJson());
  const result = runCheck([
    "--baseline",
    baseline,
    "--require-baseline",
    "--max-age-days",
    "abc",
  ]);

  assert.equal(result.status, 1);
  assert.match(result.stderr, /positive integer/i);
});

test("required check fails a baseline without generatedAt provenance", () => {
  const withoutProvenance = baselineJson();
  delete withoutProvenance.generatedAt;
  const baseline = writeFixture("no-provenance.json", withoutProvenance);
  const result = runCheck(["--baseline", baseline, "--require-baseline"]);

  assert.equal(result.status, 1);
  assert.match(result.stderr, /generatedAt/i);
});

test("required check fails a baseline missing an SLO class reading", () => {
  const incomplete = baselineJson();
  delete incomplete.endpoints.webhooks;
  const baseline = writeFixture("incomplete.json", incomplete);
  const result = runCheck(["--baseline", baseline, "--require-baseline"]);

  assert.equal(result.status, 1);
  assert.match(result.stderr, /webhooks/);
});

test("required check fails an over-tolerance p95 without an explicit --enforce", () => {
  const baseline = writeFixture(
    "over-tolerance.json",
    baselineJson({ endpoints: { auth: { p95: 400 } } }),
  );
  const result = runCheck(["--baseline", baseline, "--require-baseline"]);

  assert.equal(result.status, 1);
  assert.match(result.stderr, /exceeds budget/);
});

test("required check passes an over-budget p95 that is within tolerance", () => {
  const baseline = writeFixture(
    "within-tolerance.json",
    baselineJson({ endpoints: { auth: { p95: 330 } } }),
  );
  const result = runCheck(["--baseline", baseline, "--require-baseline"]);

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stderr, /within tolerance/);
});

test("required check fails an over-budget p99", () => {
  const baseline = writeFixture(
    "p99-over.json",
    baselineJson({ endpoints: { crud: { p95: 150, p99: 600 } } }),
  );
  const result = runCheck(["--baseline", baseline, "--require-baseline"]);

  assert.equal(result.status, 1);
  assert.match(result.stderr, /p99/);
});

test("required check fails invalid JSON", () => {
  const baseline = writeFixture("invalid.json", "{ not json");
  const result = runCheck(["--baseline", baseline, "--require-baseline"]);

  assert.equal(result.status, 1);
  assert.match(result.stderr, /not valid JSON/);
});

test("optional check still exits 0 on invalid JSON", () => {
  const baseline = writeFixture("invalid-optional.json", "{ not json");
  const result = runCheck(["--baseline", baseline]);

  assert.equal(result.status, 0);
  assert.match(result.stderr, /not valid JSON/);
});

test("--write-baseline records generatedAt and the converted endpoints", () => {
  const soak = writeFixture("soak.json", {
    complete: true,
    endpoints: {
      auth: { p95: 111, samples: 42 },
      crud: { p95: 150, p99: 410, samples: 84 },
      search: { p95: 220, samples: 60 },
      reports: { p95: 900, samples: 50 },
      webhooks: { p95: 40, samples: 60 },
    },
  });
  const output = path.join(fixtureDir, "written-baseline.json");
  const result = runCheck([
    "--baseline",
    output,
    "--write-baseline",
    soak,
  ]);

  assert.equal(result.status, 0, result.stderr);
  const written = JSON.parse(readFileSync(output, "utf8"));
  assert.equal(typeof written.generatedAt, "string");
  assert.equal(written.endpoints.auth.p95, 111);
  assert.equal(written.source, soak);
});

test("--write-baseline accepts the pnpm `--` separator the docs use", () => {
  // `pnpm perf:api-latency:baseline -- ./soak-metrics.json` forwards a literal
  // `--`; before this fix the soak path resolved to `--` and failed with ENOENT,
  // which meant the documented conversion step had never worked.
  const soak = writeFixture("separator-soak.json", {
    complete: true,
    endpoints: {
      auth: { p95: 111, samples: 42 },
      crud: { p95: 150, p99: 410, samples: 84 },
      search: { p95: 220, samples: 60 },
      reports: { p95: 900, samples: 50 },
      webhooks: { p95: 40, samples: 60 },
    },
  });
  const output = path.join(fixtureDir, "separator-baseline.json");
  const result = runCheck([
    "--write-baseline",
    "--",
    "--baseline",
    output,
    soak,
  ]);

  assert.equal(result.status, 0, result.stderr);
  assert.equal(
    JSON.parse(readFileSync(output, "utf8")).endpoints.auth.p95,
    111,
  );
});

test("--write-baseline refuses a capture the soak marked incomplete", () => {
  const soak = writeFixture("incomplete-soak.json", {
    complete: false,
    incompleteReasons: ["crud: 3 sample(s), minimum 20"],
    endpoints: {
      auth: { p95: 111, samples: 42 },
      crud: { p95: 150, samples: 3 },
      search: { p95: 220, samples: 60 },
      reports: { p95: 900, samples: 50 },
      webhooks: { p95: 40, samples: 60 },
    },
  });
  const output = path.join(fixtureDir, "must-not-be-written.json");
  const result = runCheck([
    "--baseline",
    output,
    "--write-baseline",
    soak,
  ]);

  assert.equal(result.status, 1);
  assert.match(result.stderr, /incomplete soak/i);
  assert.match(result.stderr, /crud: 3 sample\(s\)/);
  assert.equal(existsSync(output), false, "no baseline may be written");
});

test("--write-baseline refuses a soak with too few samples per class", () => {
  const soak = writeFixture("thin-soak.json", {
    complete: true,
    endpoints: {
      auth: { p95: 111, samples: 42 },
      crud: { p95: 150, samples: 19 },
      search: { p95: 220, samples: 60 },
      reports: { p95: 900, samples: 50 },
      webhooks: { p95: 40 },
    },
  });
  const output = path.join(fixtureDir, "thin-baseline.json");
  const result = runCheck([
    "--baseline",
    output,
    "--write-baseline",
    soak,
  ]);

  assert.equal(result.status, 1);
  assert.match(result.stderr, /thin evidence/i);
  assert.match(result.stderr, /crud/);
  assert.match(result.stderr, /webhooks/);
  assert.equal(existsSync(output), false);
});
