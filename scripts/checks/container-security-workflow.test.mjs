import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { runInNewContext } from "node:vm";
import YAML from "yaml";

const workflow = YAML.parse(
  readFileSync(".github/workflows/container-scan.yml", "utf8"),
);
const jobs = Object.values(workflow.jobs);
const scanJobs = jobs.filter((job) =>
  job.steps.some((step) => step.uses?.startsWith("aquasecurity/trivy-action@")),
);

function shouldRun(
  step,
  { upload = "", report = true, failed = false, output } = {},
) {
  if (!step.if) return !failed;
  return runInNewContext(step.if.replace(/^\$\{\{\s*|\s*\}\}$/g, ""), {
    always: () => true,
    success: () => !failed,
    vars: { OSV_UPLOAD_SARIF: upload },
    hashFiles: (file) => (report && file === output ? "report-hash" : ""),
  });
}

test("scheduled dependency scanning includes the monorepo resolved lockfile", () => {
  assert.ok(existsSync("pnpm-lock.yaml"));
  assert.ok(scanJobs.length > 0);
  const covered = scanJobs.some((job) =>
    job.steps.some((step) => {
      if (!step.uses?.startsWith("aquasecurity/trivy-action@")) return false;
      if (!["fs", "repo"].includes(step.with["scan-type"])) return false;
      const relative = path.relative(
        path.resolve(step.with["scan-ref"]),
        path.resolve("pnpm-lock.yaml"),
      );
      const excluded = (step.with["skip-files"] ?? "")
        .split(",")
        .includes("pnpm-lock.yaml");
      return !relative.startsWith("..") && !excluded;
    }),
  );
  assert.ok(covered, "App-only filesystem scans omit resolved dependencies");
});

for (const [index, job] of scanJobs.entries()) {
  test(`scan job ${index + 1} retains failures and reports without requiring code scanning`, () => {
    assert.equal(job.permissions.actions, "read");
    assert.equal(job.permissions["security-events"], "write");
    assert.notEqual(job["continue-on-error"], true);
    const scanner = job.steps.find((step) =>
      step.uses?.startsWith("aquasecurity/trivy-action@"),
    );
    assert.equal(String(scanner.with["exit-code"]), "1");
    assert.notEqual(scanner["continue-on-error"], true);
    const retain = job.steps.find((step) =>
      step.uses?.startsWith("actions/upload-artifact@"),
    );
    assert.ok(retain, "Reports must remain available without the Security tab");
    assert.equal(retain.with.path, scanner.with.output);
    assert.equal(retain.with["if-no-files-found"], "error");
    assert.equal(shouldRun(retain, { failed: true }), true);
    assert.notEqual(retain["continue-on-error"], true);
    const securityUpload = job.steps.find((step) =>
      step.uses?.startsWith("github/codeql-action/upload-sarif@"),
    );
    assert.ok(securityUpload);
    assert.equal(securityUpload.with.sarif_file, scanner.with.output);
    for (const [upload, report, failed, expected] of [
      ["", true, false, false],
      ["false", true, false, false],
      ["true", false, false, false],
      ["true", true, false, true],
      ["true", true, true, true],
    ]) {
      assert.equal(
        shouldRun(securityUpload, {
          upload,
          report,
          failed,
          output: scanner.with.output,
        }),
        expected,
      );
    }
  });
}
