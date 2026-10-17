import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const scriptsDirectory = path.dirname(fileURLToPath(import.meta.url));
const requiredLatencyCommand = [
  "check:api-latency-budget:enforce",
  "--require-baseline",
  "--max-age-days",
  "7",
];
const dayMs = 24 * 60 * 60 * 1000;

function compliantBaseline() {
  return {
    generatedAt: new Date().toISOString(),
    source: "synthetic-release-gate-fixture.json",
    endpoints: {
      auth: { p95: 120 },
      crud: { p95: 150, p99: 400 },
      search: { p95: 200 },
      reports: { p95: 900 },
      webhooks: { p95: 40 },
    },
  };
}

function gateFixture(baseline) {
  const root = mkdtempSync(path.join(tmpdir(), "docita-release-gate-"));
  const bin = path.join(root, "bin");
  const checks = path.join(root, "scripts/checks");
  const callsFile = path.join(root, "calls.jsonl");
  for (const directory of [
    bin,
    checks,
    path.join(checks, "allowlists"),
    path.join(root, "apps"),
    path.join(root, "packages"),
    path.join(root, "artifacts"),
  ]) {
    mkdirSync(directory, { recursive: true });
  }
  copyFileSync(
    path.join(scriptsDirectory, "release-gate.sh"),
    path.join(root, "scripts/release-gate.sh"),
  );
  for (const file of ["check-api-latency-budget.mjs", "api-latency-slos.mjs"]) {
    copyFileSync(
      path.join(scriptsDirectory, "checks", file),
      path.join(checks, file),
    );
  }
  writeFileSync(path.join(root, "pnpm-lock.yaml"), "lockfileVersion: '9.0'\n");
  writeFileSync(path.join(root, ".jscpd.json"), '{"ignore":[]}\n');
  writeFileSync(
    path.join(checks, "allowlists/zod-interface-parity.json"),
    "[]\n",
  );
  writeFileSync(
    path.join(root, "packages/fixture.ts"),
    "// check-as-cast-density: allow-file fixture\n",
  );
  writeFileSync(callsFile, "");
  const appScripts = Object.fromEntries(
    ["app", "internal", "landing"].map((app) => {
      const manifest = JSON.parse(
        readFileSync(
          path.join(scriptsDirectory, "..", "apps", app, "package.json"),
          "utf8",
        ),
      );
      return [manifest.name, manifest.scripts];
    }),
  );
  if (baseline !== undefined) {
    writeFileSync(
      path.join(root, "artifacts/api-latency-baseline.json"),
      typeof baseline === "string" ? baseline : JSON.stringify(baseline),
    );
  }
  writeFileSync(
    path.join(bin, "pnpm"),
    `#!${process.execPath}
import { appendFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
const args = process.argv.slice(2);
appendFileSync(${JSON.stringify(callsFile)}, JSON.stringify(args) + '\\n');
const appScripts = ${JSON.stringify(appScripts)};
if (args[0] === '--filter' && args[2] === 'run' && appScripts[args[1]] && !Object.hasOwn(appScripts[args[1]], args[3])) {
  process.stderr.write('Unknown workspace script: ' + args[1] + ' ' + args[3] + '\\n');
  process.exit(1);
}
if (args[0] === process.env.DOCITA_TEST_FAIL_COMMAND) {
  process.exit(23);
}
if (args[0] === 'check:api-latency-budget:enforce' || args[0] === 'verify:standard') {
  const extra = args[0] === 'verify:standard' ? [] : args.slice(1);
  const checked = spawnSync(process.execPath, ['scripts/checks/check-api-latency-budget.mjs', '--enforce', ...extra], {
    encoding: 'utf8', timeout: 5000,
  });
  process.stdout.write(checked.stdout ?? '');
  process.stderr.write(checked.stderr ?? '');
  process.exit(checked.status ?? 1);
}
`,
    { mode: 0o700 },
  );
  return {
    run(args = [], failCommand = "") {
      const result = spawnSync("bash", ["scripts/release-gate.sh", ...args], {
        cwd: root,
        env: {
          ...process.env,
          PATH: `${bin}${path.delimiter}${path.dirname(process.execPath)}${path.delimiter}${process.env.PATH}`,
          DOCITA_TEST_FAIL_COMMAND: failCommand,
        },
        encoding: "utf8",
        timeout: 10000,
      });
      return {
        ...result,
        calls: readFileSync(callsFile, "utf8")
          .trim()
          .split("\n")
          .filter(Boolean)
          .map(JSON.parse),
      };
    },
    cleanup() {
      rmSync(root, { recursive: true, force: true });
    },
  };
}

function rejectsBeforeBuild(result, reason) {
  assert.equal(result.error, undefined, result.error?.message);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, reason);
  assert.ok(
    result.calls.some(
      (args) => JSON.stringify(args) === JSON.stringify(requiredLatencyCommand),
    ),
  );
  assert.equal(
    result.calls.some(
      (args) =>
        args.includes("build") || args.includes("build:cloudflare:production"),
    ),
    false,
  );
  assert.doesNotMatch(
    result.stdout,
    /All checks green|Local release checks passed/,
  );
}

for (const args of [[], ["--no-build"]]) {
  test(`full gate ${args.join(" ") || "with builds"} rejects absent latency evidence`, () => {
    const fixture = gateFixture();
    try {
      rejectsBeforeBuild(fixture.run(args), /no baseline/i);
    } finally {
      fixture.cleanup();
    }
  });
}

test("full gate rejects a baseline older than seven days before builds", () => {
  const fixture = gateFixture({
    ...compliantBaseline(),
    generatedAt: new Date(Date.now() - 8 * dayMs).toISOString(),
  });
  try {
    rejectsBeforeBuild(fixture.run(), /baseline is stale.*maximum 7/i);
  } finally {
    fixture.cleanup();
  }
});

test("full gate rejects an over-budget baseline before builds", () => {
  const baseline = compliantBaseline();
  baseline.endpoints.crud.p99 = 900;
  const fixture = gateFixture(baseline);
  try {
    rejectsBeforeBuild(fixture.run(), /crud: p99=900ms exceeds budget 500ms/);
  } finally {
    fixture.cleanup();
  }
});

test("full gate rejects malformed baseline evidence before builds", () => {
  const fixture = gateFixture("{");
  try {
    rejectsBeforeBuild(fixture.run(), /not valid JSON/);
  } finally {
    fixture.cleanup();
  }
});

test("fresh compatible evidence passes local checks and preserves remaining release gates", () => {
  const fixture = gateFixture(compliantBaseline());
  try {
    const result = fixture.run();
    assert.equal(result.status, 0, result.stderr);
    assert.ok(
      result.calls.some(
        (args) =>
          JSON.stringify(args) === JSON.stringify(requiredLatencyCommand),
      ),
    );
    assert.ok(result.calls.some((args) => args[0] === "build"));
    assert.match(result.stdout, /Local release checks passed/);
    assert.match(result.stdout, /do not authorize.*merge.*release/i);
    assert.match(result.stdout, /required CI.*review.*recovery.*soak/i);
    assert.match(
      result.stdout,
      /pnpm rollback:fly --config fly\.toml --image <recorded-image>/,
    );
    assert.match(
      result.stdout,
      /pnpm rollback:fly --config apps\/worker\/fly\.toml --image <recorded-image>/,
    );
    assert.match(result.stdout, /Cloudflare.*selected.*version/i);
    assert.doesNotMatch(
      result.stdout,
      /fly releases rollback|Tag the release and merge/,
    );
  } finally {
    fixture.cleanup();
  }
});

test("no-build still requires evidence and labels its omitted build checks", () => {
  const fixture = gateFixture(compliantBaseline());
  try {
    const result = fixture.run(["--no-build"]);
    assert.equal(result.status, 0, result.stderr);
    assert.ok(
      result.calls.some(
        (args) =>
          JSON.stringify(args) === JSON.stringify(requiredLatencyCommand),
      ),
    );
    assert.equal(
      result.calls.some((args) => args[0] === "build"),
      false,
    );
    assert.match(result.stdout, /builds.*skipped.*--no-build/i);
  } finally {
    fixture.cleanup();
  }
});

test("fast mode remains an optional subset and never declares release readiness", () => {
  const fixture = gateFixture();
  try {
    const result = fixture.run(["--fast"]);
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(result.calls, [
      ["install", "--frozen-lockfile"],
      ["lint"],
      ["turbo", "check-types", "--continue"],
    ]);
    assert.match(result.stdout, /subset.*not release.ready/i);
    assert.doesNotMatch(
      result.stdout,
      /All checks green|Local release checks passed/,
    );
  } finally {
    fixture.cleanup();
  }
});

test("a subsequent command failure remains nonzero and prevents success output", () => {
  const fixture = gateFixture(compliantBaseline());
  try {
    const result = fixture.run([], "knip");
    assert.notEqual(result.status, 0);
    assert.equal(result.error, undefined, result.error?.message);
    assert.match(result.stderr, /command failed: pnpm knip/);
    assert.equal(
      result.calls.some((args) => args[0] === "build"),
      false,
    );
    assert.doesNotMatch(
      result.stdout,
      /All checks green|Local release checks passed/,
    );
  } finally {
    fixture.cleanup();
  }
});
