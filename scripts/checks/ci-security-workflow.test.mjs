import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { runInNewContext } from "node:vm";

const source = readFileSync(".github/workflows/ci.yml", "utf8");

function job(name) {
  const section = source.match(
    new RegExp(`^  ${name}:\\n([\\s\\S]*?)(?=^  [\\w-]+:|(?![\\s\\S]))`, "m"),
  )?.[1];
  assert.ok(section, `Missing ${name} job`);
  return section;
}

function expression(section, key, indent) {
  const value = section.match(
    new RegExp(`^${" ".repeat(indent)}${key}: (.+)$`, "m"),
  )?.[1];
  assert.ok(value, `Missing explicit ${key}`);
  return value.replace(/^\$\{\{\s*|\s*\}\}$/g, "");
}

function context(event, dependencies, draft = false) {
  return {
    github: { event_name: event, event: { pull_request: { draft } } },
    needs: { changes: { outputs: { dependencies: String(dependencies) } } },
    vars: {},
  };
}

test("security scans gate PR regressions and retain full scans outside PRs", () => {
  for (const [event, dependencies, draft, expected] of [
    ["pull_request", true, false, ["osv-scan"]],
    ["push", true, false, ["security-audit"]],
    ["workflow_dispatch", true, false, ["security-audit"]],
    ["pull_request", true, true, []],
    ["pull_request", false, false, []],
    ["push", false, false, []],
  ]) {
    const selected = ["security-audit", "osv-scan"].filter((name) =>
      runInNewContext(
        expression(job(name), "if", 4),
        context(event, dependencies, draft),
      ),
    );
    assert.deepEqual(
      selected,
      expected,
      `${event}, dependencies=${dependencies}, draft=${draft}`,
    );
  }
});

test("OSV vulnerability failures stay mandatory while Security-tab uploads are opt-in", () => {
  for (const name of ["security-audit", "osv-scan"]) {
    const section = job(name);
    assert.match(
      section,
      /^    uses: google\/osv-scanner-action\/\.github\/workflows\/osv-scanner-reusable(?:-pr)?\.yml@/m,
    );
    assert.equal(expression(section, "fail-on-vuln", 6), "true");
    assert.doesNotMatch(section, /^    continue-on-error:\s*true/m);
    const upload = expression(section, "upload-sarif", 6);
    for (const [configured, expected] of [
      [undefined, false],
      ["false", false],
      ["true", true],
    ]) {
      assert.equal(
        runInNewContext(upload, { vars: { OSV_UPLOAD_SARIF: configured } }),
        expected,
      );
    }
  }
});
