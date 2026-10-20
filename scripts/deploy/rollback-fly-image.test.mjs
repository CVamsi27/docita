import { afterEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  chmodSync,
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const deployDirectory = dirname(fileURLToPath(import.meta.url));
const helper = join(deployDirectory, "rollback-fly-image.mjs");
const repositoryRoot = resolve(deployDirectory, "../..");
const scratchDirectories = [];

afterEach(() => {
  for (const directory of scratchDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

function fixture(
  config = 'app = "rollback-api"\nprimary_region = "sin"\n[http_service]\ninternal_port = 3001\n',
) {
  const directory = mkdtempSync(join(tmpdir(), "docita-fly-rollback-"));
  scratchDirectories.push(directory);
  const configPath = join(directory, "fly.toml");
  const callsPath = join(directory, "calls.jsonl");
  writeFileSync(configPath, config);
  const fakeFlyPath = join(directory, "flyctl");
  writeFileSync(
    fakeFlyPath,
    `#!/usr/bin/env node
import { appendFileSync } from "node:fs";
appendFileSync(process.env.FAKE_FLY_CALLS, JSON.stringify(process.argv.slice(2)) + "\\n");
if (process.env.FAKE_FLY_STATUS) {
  process.stderr.write("synthetic Fly deploy failure\\n");
  process.exitCode = Number(process.env.FAKE_FLY_STATUS);
}
`,
  );
  chmodSync(fakeFlyPath, 0o755);
  return { directory, configPath, callsPath };
}

function run(target, args, env = {}) {
  const result = spawnSync(process.execPath, [helper, ...args], {
    cwd: repositoryRoot,
    env: {
      ...process.env,
      PATH: `${target.directory}:${process.env.PATH}`,
      FAKE_FLY_CALLS: target.callsPath,
      ...env,
    },
    encoding: "utf8",
  });
  const calls = existsSync(target.callsPath)
    ? readFileSync(target.callsPath, "utf8")
        .trim()
        .split("\n")
        .map((line) => JSON.parse(line))
    : [];
  return { ...result, calls };
}

const selectors = (
  target,
  image = "registry.fly.io/rollback-api:deployment-recorded",
) => ["--config", target.configPath, "--image", image];

describe("Fly image rollback artifact", () => {
  it("deploys the selected recorded API image with canonical region and HTTP strategy", () => {
    const target = fixture();
    const result = run(target, selectors(target));

    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(result.calls, [
      [
        "deploy",
        "--config",
        target.configPath,
        "--app",
        "rollback-api",
        "--image",
        "registry.fly.io/rollback-api:deployment-recorded",
        "--primary-region",
        "sin",
        "--strategy",
        "bluegreen",
        "--skip-release-command",
      ],
    ]);
  });

  it("uses rolling and disables spare machines for the configured worker", () => {
    const target = fixture(
      'app = "rollback-worker"\nprimary_region = "bom"\n[deploy]\nrelease_command = "do-not-run-migrations"\n',
    );
    const result = run(
      target,
      selectors(target, "registry.fly.io/rollback-worker:v1.2.3"),
    );

    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(result.calls, [
      [
        "deploy",
        "--config",
        target.configPath,
        "--app",
        "rollback-worker",
        "--image",
        "registry.fly.io/rollback-worker:v1.2.3",
        "--primary-region",
        "bom",
        "--strategy",
        "rolling",
        "--ha=false",
        "--skip-release-command",
      ],
    ]);
  });

  it("honors parsed TOML inline comments and explicit flags over ambient app/region", () => {
    const target = fixture(
      'app = "rollback-api" # canonical app\nprimary_region = "ams" # selected capacity\n[http_service]\ninternal_port = 3001\n',
    );
    const result = run(target, selectors(target), {
      FLY_APP: "other-app",
      FLY_PRIMARY_REGION: "other-region",
    });

    assert.equal(result.status, 0, result.stderr);
    assert.equal(
      result.calls[0][result.calls[0].indexOf("--app") + 1],
      "rollback-api",
    );
    assert.equal(
      result.calls[0][result.calls[0].indexOf("--primary-region") + 1],
      "ams",
    );
  });

  it("accepts a pinned image digest belonging to the configured app", () => {
    const target = fixture();
    const image = `registry.fly.io/rollback-api@sha256:${"a".repeat(64)}`;
    const result = run(target, selectors(target, image));

    assert.equal(result.status, 0, result.stderr);
    assert.equal(
      result.calls[0][result.calls[0].indexOf("--image") + 1],
      image,
    );
  });

  for (const [configPath, app, strategy] of [
    ["fly.toml", "docita-api", "bluegreen"],
    ["apps/worker/fly.toml", "docita-worker", "rolling"],
  ]) {
    it(`executes the current canonical ${configPath} artifact`, () => {
      const target = fixture();
      const result = run(target, [
        "--config",
        configPath,
        "--image",
        `registry.fly.io/${app}:deployment-recorded`,
      ]);

      assert.equal(result.status, 0, result.stderr);
      assert.equal(result.calls.length, 1);
      assert.equal(result.calls[0][result.calls[0].indexOf("--app") + 1], app);
      assert.equal(
        result.calls[0][result.calls[0].indexOf("--strategy") + 1],
        strategy,
      );
    });
  }

  for (const image of [
    "registry.fly.io/other-app:deployment-recorded",
    "registry.fly.io/rollback-api-other:deployment-recorded",
    "registry.fly.io/rollback-api/nested:deployment-recorded",
    "ghcr.io/rollback-api:deployment-recorded",
    "registry.fly.io/rollback-api",
    "registry.fly.io/rollback-api:latest",
    "registry.fly.io/rollback-api:",
    "registry.fly.io/rollback-api@sha256:short",
    "registry.fly.io/rollback-api:deployment-recorded\n--app other-app",
  ]) {
    it(`rejects unqualified, mutable or wrong-app image ${JSON.stringify(image)} before Fly calls`, () => {
      const target = fixture();
      const result = run(target, selectors(target, image));

      assert.equal(result.status, 1);
      assert.match(result.stderr, /^Rollback validation failed:/);
      assert.match(result.stderr, /image/i);
      assert.deepEqual(result.calls, []);
    });
  }

  for (const [config, message] of [
    ['app = "rollback-api"\nprimary_region =', /TOML/],
    ['primary_region = "sin"', /app/],
    ['app = "bad app"\nprimary_region = "sin"', /app/],
    ['app = "rollback-api"', /primary_region/],
    ['app = "rollback-api"\nprimary_region = "SIN"', /primary_region/],
  ]) {
    it(`rejects invalid config ${JSON.stringify(config)} before Fly calls`, () => {
      const target = fixture(config);
      const result = run(target, selectors(target));

      assert.equal(result.status, 1);
      assert.match(result.stderr, /^Rollback validation failed:/);
      assert.match(result.stderr, message);
      assert.deepEqual(result.calls, []);
    });
  }

  it("requires both selectors and refuses deployment flag overrides", () => {
    const target = fixture();
    for (const args of [
      [],
      ["--config", target.configPath],
      [...selectors(target), "--app", "other-app"],
    ]) {
      const result = run(target, args);
      assert.equal(result.status, 1);
      assert.match(result.stderr, /^Rollback validation failed:/);
      assert.deepEqual(result.calls, []);
    }
  });

  it("propagates a Fly deploy failure without trying another image or migration", () => {
    const target = fixture();
    const result = run(target, selectors(target), { FAKE_FLY_STATUS: "42" });

    assert.equal(result.status, 42);
    assert.match(result.stderr, /synthetic Fly deploy failure/);
    assert.equal(result.calls.length, 1);
  });

  it("provides help without requiring selectors or invoking Fly", () => {
    const target = fixture();
    const result = run(target, ["--help"]);

    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /--config/);
    assert.match(result.stdout, /--image/);
    assert.deepEqual(result.calls, []);
  });
});
