import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const script = fileURLToPath(
  new URL("./check-workflow-staleness.mjs", import.meta.url),
);
const legacyHolds = [
  "scale-api-hours.yml",
  "synthetic-monitoring.yml",
  "stop-db-auto-restart.yml",
];

function runGuard({
  state = "disabled_manually",
  recent = false,
  missing = false,
  unrelated = false,
} = {}) {
  const root = mkdtempSync(path.join(tmpdir(), "docita-workflow-hold-"));
  try {
    const files = [...legacyHolds, "daily-worker.yml", "other-scheduled.yml"];
    const workflowDirectory = path.join(root, ".github/workflows");
    mkdirSync(workflowDirectory, { recursive: true });
    for (const file of files) {
      if (missing && file === "daily-worker.yml") continue;
      writeFileSync(
        path.join(workflowDirectory, file),
        "name: Fixture\non:\n  schedule:\n    - cron: '0 0 * * *'\n",
      );
    }
    const workflows = files.map((file, index) => ({
      id: index + 1,
      path: `.github/workflows/${file}`,
      state: file === "daily-worker.yml" ? state : "disabled_manually",
    }));
    const startedAt = new Date().toISOString();
    const runs = Object.fromEntries(
      workflows.map((workflow) => [
        workflow.id,
        {
          workflow_runs: [
            {
              run_started_at: workflow.path.endsWith("daily-worker.yml")
                ? recent
                  ? startedAt
                  : "2020-01-01T00:00:00Z"
                : workflow.path.endsWith("other-scheduled.yml") && unrelated
                  ? "2020-01-01T00:00:00Z"
                  : startedAt,
            },
          ],
        },
      ]),
    );
    const preload = path.join(root, "offline-github.mjs");
    writeFileSync(
      preload,
      `
      const workflows = ${JSON.stringify(workflows)};
      const runs = ${JSON.stringify(runs)};
      globalThis.fetch = async (input) => {
        const url = new URL(input);
        if (url.origin !== 'https://api.github.com')
          throw new Error('Unexpected network destination in offline fixture');
        if (url.pathname === '/repos/fixture/docita/actions/workflows')
          return Response.json({ workflows });
        const match = /^\\/repos\\/fixture\\/docita\\/actions\\/workflows\\/(\\d+)\\/runs$/.exec(url.pathname);
        if (match && runs[match[1]]) return Response.json(runs[match[1]]);
        throw new Error('Unexpected GitHub route in offline fixture');
      };
    `,
    );
    return spawnSync(process.execPath, ["--import", preload, script], {
      cwd: root,
      encoding: "utf8",
      timeout: 5_000,
      env: {
        PATH: process.env.PATH,
        GITHUB_REPOSITORY: "fixture/docita",
        GITHUB_TOKEN: "offline-fixture-token",
      },
    });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test("intentional daily worker hold does not fail for its old last run", () => {
  const result = runGuard();
  assert.equal(result.status, 0, result.stderr || result.stdout);
});

test("re-enabled daily worker is checked and fails when stale", () => {
  const result = runGuard({ state: "active" });
  assert.equal(result.status, 1, result.stdout);
  assert.match(result.stderr, /daily-worker\.yml has not run/);
  assert.match(result.stdout, /daily-worker\.yml: no longer disabled_manually/);
});

test("other disabled states do not inherit the deliberate daily worker hold", () => {
  const result = runGuard({ state: "disabled_inactivity" });
  assert.equal(result.status, 1, result.stdout);
  assert.match(result.stderr, /daily-worker\.yml has not run/);
});

test("an undocumented disabled schedule still fails when stale", () => {
  const result = runGuard({ unrelated: true, recent: true });
  assert.equal(result.status, 1, result.stdout);
  assert.match(result.stderr, /other-scheduled\.yml has not run/);
});

test("removing the documented daily worker file fails instead of hiding the hold", () => {
  const result = runGuard({ missing: true });
  assert.equal(result.status, 1, result.stdout);
  assert.match(
    result.stderr,
    /daily-worker\.yml is allowlisted.*no longer exists/,
  );
});

test("a recently run re-enabled daily worker passes normal staleness checks", () => {
  const result = runGuard({ state: "active", recent: true });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /daily-worker\.yml: no longer disabled_manually/);
});
