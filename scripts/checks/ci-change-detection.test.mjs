import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import YAML from "yaml";

const workflow = YAML.parse(readFileSync(".github/workflows/ci.yml", "utf8"));

for (const name of [
  "api-quality",
  "app-quality",
  "internal-quality",
  "worker-quality",
]) {
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
