import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import YAML from "yaml";

const workflow = YAML.parse(readFileSync(".github/workflows/ci.yml", "utf8"));

for (const name of ["app-quality", "internal-quality", "worker-quality"]) {
  const job = workflow.jobs[name];
  test(`${name} change detection preserves the merge base after main advances`, () => {
    assert.ok(job, `Missing CI job: ${name}`);
    const root = mkdtempSync(path.join(tmpdir(), "docita-ci-history-"));
    const source = path.join(root, "source");
    const checkout = path.join(root, "checkout");
    const git = (args, cwd = source) =>
      execFileSync("git", args, {
        cwd,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      });
    try {
      execFileSync("git", ["init", "-q", "-b", "main", source]);
      const commit = (message) =>
        git([
          "-c",
          "user.name=Fixture",
          "-c",
          "user.email=fixture@example.invalid",
          "commit",
          "-qm",
          message,
        ]);
      writeFileSync(path.join(source, "file"), "base");
      git(["add", "."]);
      commit("base");
      git(["checkout", "-qb", "feature"]);
      writeFileSync(path.join(source, "feature"), "feature");
      git(["add", "."]);
      commit("feature");
      git(["checkout", "-q", "main"]);
      writeFileSync(path.join(source, "file"), "advanced");
      git(["add", "."]);
      commit("advance main");
      execFileSync("git", [
        "clone",
        "-q",
        "--branch",
        "feature",
        source,
        checkout,
      ]);
      const fetch = job.steps.find(
        (step) => step.name === "Fetch main branch for change detection",
      );
      assert.ok(fetch);
      execFileSync("/bin/sh", ["-c", fetch.run], {
        cwd: checkout,
        stdio: "pipe",
      });
      assert.equal(
        git(["diff", "--name-only", "origin/main...HEAD"], checkout).trim(),
        "feature",
      );
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
}

test("API global coverage rejects an untouched required file without tests", () => {
  const root = mkdtempSync(path.join(tmpdir(), "docita-ci-coverage-"));
  const api = path.join(root, "apps/api");
  const source = path.join(api, "src");
  const git = (args) => execFileSync("git", args, { cwd: root, stdio: "pipe" });
  const quote = (value) => `'${value.replaceAll("'", "'\\''")}'`;
  const command = workflow.jobs["api-quality"].steps.find((step) =>
    step.run?.includes("pnpm --filter @docita/api run test:ci"),
  )?.run;
  assert.ok(command, "Missing API coverage command");
  try {
    mkdirSync(source, { recursive: true });
    writeFileSync(
      path.join(root, "package.json"),
      JSON.stringify({ private: true, packageManager: "pnpm@10.30.3" }),
    );
    writeFileSync(
      path.join(root, "pnpm-workspace.yaml"),
      "packages:\n  - apps/*\n",
    );
    writeFileSync(
      path.join(api, "package.json"),
      JSON.stringify({
        name: "@docita/api",
        private: true,
        scripts: {
          "test:ci": `node ${quote(path.resolve("apps/api/node_modules/jest/bin/jest.js"))} --ci --coverage --runInBand`,
        },
      }),
    );
    writeFileSync(
      path.join(api, "jest.config.json"),
      JSON.stringify({
        testEnvironment: "node",
        transform: {},
        collectCoverageFrom: ["src/*.js", "!src/*.test.js"],
        coverageThreshold: {
          global: {
            statements: 100,
            branches: 100,
            functions: 100,
            lines: 100,
          },
        },
        coverageReporters: ["text-summary"],
      }),
    );
    writeFileSync(
      path.join(source, "changed.js"),
      "exports.double = n => n * 2;\n",
    );
    writeFileSync(
      path.join(source, "untouched.js"),
      "exports.isAuthorized = user => user.role === 'admin';\n",
    );
    writeFileSync(
      path.join(source, "changed.test.js"),
      "const {double} = require('./changed'); test('doubles', () => expect(double(2)).toBe(4));\n",
    );
    git(["init", "-q", "-b", "main"]);
    git(["add", "."]);
    git([
      "-c",
      "user.name=Fixture",
      "-c",
      "user.email=fixture@example.invalid",
      "commit",
      "-qm",
      "coverage baseline",
    ]);
    git(["update-ref", "refs/remotes/origin/main", "HEAD"]);
    git(["checkout", "-qb", "feature"]);
    writeFileSync(
      path.join(source, "changed.js"),
      "exports.double = n => n * 2;\n// Feature change.\n",
    );
    const result = spawnSync("/bin/sh", ["-c", command], {
      cwd: root,
      encoding: "utf8",
      timeout: 45000,
    });
    const output = `${result.stdout || ""}\n${result.stderr || ""}`;
    assert.equal(result.status, 1, output);
    assert.match(output, /coverage threshold .*not met/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
