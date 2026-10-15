import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { pathToFileURL } from "node:url";

const script = path.resolve("scripts/checks/check-dependency-exceptions.mjs");
const advisory = "GHSA-vfj7-8cjw-p6xm";
const activeException = `[[IgnoredVulns]]
id = "${advisory}"
ignoreUntil = 2026-11-12
reason = "Owner: maintainers. Only trusted development patterns."
`;

function runFixture({
  ghsa = [advisory],
  cves = [],
  toml = activeException,
  now,
} = {}) {
  const root = mkdtempSync(
    path.join(tmpdir(), "docita-dependency-exceptions-"),
  );
  try {
    writeFileSync(
      path.join(root, "package.json"),
      JSON.stringify({
        pnpm: { auditConfig: { ignoreGhsas: ghsa, ignoreCves: cves } },
      }),
    );
    writeFileSync(path.join(root, "osv-scanner.toml"), toml);
    const args = now
      ? [
          "--input-type=module",
          "--eval",
          `import { checkDependencyExceptions } from ${JSON.stringify(pathToFileURL(script).href)};
const findings = checkDependencyExceptions({ now: new Date(${JSON.stringify(now)}) });
process.stderr.write(findings.join("\\n"));
process.exitCode = findings.length ? 1 : 0;`,
        ]
      : [script];
    return spawnSync(process.execPath, args, { cwd: root, encoding: "utf8" });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test("dependency exception CLI accepts a repository without suppressions", () => {
  const result = runFixture({ ghsa: [], toml: "" });
  assert.equal(result.status, 0, result.stderr);
});

test("pnpm and OSV can share an unexpired exception", () => {
  const result = runFixture({ now: "2026-11-11T23:59:59.999Z" });
  assert.equal(result.status, 0, result.stderr);
});

test("pnpm suppressions expire at the canonical OSV date in UTC", () => {
  for (const now of ["2026-11-12T00:00:00.000Z", "2026-12-13T00:00:00.000Z"]) {
    const result = runFixture({ now });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /GHSA-vfj7-8cjw-p6xm.*expired.*2026-11-12/);
  }
});

for (const [name, options, message] of [
  ["pnpm-only ignores", { toml: "" }, /missing from osv-scanner\.toml/],
  ["OSV-only ignores", { ghsa: [] }, /missing from pnpm auditConfig/],
  [
    "duplicate pnpm ignores",
    { ghsa: [advisory, advisory] },
    /duplicate pnpm ignore/,
  ],
  [
    "duplicate OSV ignores",
    { toml: activeException + activeException },
    /duplicate OSV ignore/,
  ],
  [
    "undated ignores",
    { toml: activeException.replace("ignoreUntil = 2026-11-12\n", "") },
    /ignoreUntil.*TOML date/,
  ],
  [
    "quoted dates",
    { toml: activeException.replace("2026-11-12", '"2026-11-12"') },
    /ignoreUntil.*TOML date/,
  ],
  [
    "timestamp expiry",
    { toml: activeException.replace("2026-11-12", "2026-11-12T12:00:00Z") },
    /ignoreUntil.*TOML date/,
  ],
  [
    "missing rationale",
    { toml: activeException.replace(/reason = .*\n/, "") },
    /reason.*required/,
  ],
  ["invalid pnpm list", { ghsa: advisory }, /ignoreGhsas.*array/],
  [
    "malformed TOML",
    { toml: '[[IgnoredVulns]\nid = "broken"' },
    /invalid osv-scanner\.toml/,
  ],
]) {
  test(`dependency exception gate rejects ${name}`, () => {
    const result = runFixture({ ...options, now: "2026-10-13T00:00:00Z" });
    assert.equal(result.status, 1);
    assert.match(result.stderr, message);
  });
}

test("CVE suppressions also require a canonical expiry", () => {
  const result = runFixture({
    ghsa: [],
    cves: ["CVE-2026-12345"],
    toml: activeException.replace(advisory, "CVE-2026-12345"),
    now: "2026-11-12T00:00:00Z",
  });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /CVE-2026-12345.*expired/);
});

test("TOML inline tables and comments retain their canonical expiry", () => {
  const result = runFixture({
    toml: `# A commented future date must not extend this exception.
# ignoreUntil = 2027-12-31
IgnoredVulns = [{ id = "${advisory}", ignoreUntil = 2026-11-12, reason = "Trusted tooling only" }]
`,
    now: "2026-11-12T00:00:00Z",
  });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /expired.*2026-11-12/);
});
