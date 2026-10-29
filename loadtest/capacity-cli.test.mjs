import assert from "node:assert/strict";
import test from "node:test";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const cli = fileURLToPath(new URL("./capacity.mjs", import.meta.url));
const run = (args) =>
  spawnSync(process.execPath, [cli, ...args], { encoding: "utf8" });
test("CLI dry-run exposes the model without credentials, requests or fake latency", () => {
  const result = run([
    "--dry-run",
    "--phase",
    "busy",
    "--duration-seconds",
    "30",
  ]);
  assert.equal(result.status, 0, result.stderr);
  const artifact = JSON.parse(result.stdout);
  assert.equal(artifact.evidenceKind, "dry-run-no-http-observations");
  assert.equal(artifact.plan.totalPlannedRequests, 100);
  assert.equal(artifact.summary.successfulLatencyMs.p95, null);
});
test("CLI rejects unsafe targets and unknown flags without echoing their values", () => {
  for (const args of [
    ["--dry-run", "--base-url", "https://api.docita.work"],
    ["--secret-token", "never-echo-me"],
    ["--duration-seconds", "NaN"],
  ]) {
    const result = run(args);
    assert.notEqual(result.status, 0);
    assert.ok(!result.stderr.includes("never-echo-me"));
  }
});
test("CLI real capture requires explicit credentials, output and local-environment acknowledgement", () => {
  const result = run(["--phase", "busy", "--duration-seconds", "30"]);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /credentials|output|isolated local/i);
});
