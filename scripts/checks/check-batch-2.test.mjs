import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { withoutGitEnvironment } from "./test/standards-fixture-env.mjs";

const REPO_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const NODE = process.execPath;

function script(name) {
  return path.join(REPO_ROOT, "scripts/checks", name);
}

function write(root, file, content) {
  const target = path.join(root, file);
  mkdirSync(path.dirname(target), { recursive: true });
  writeFileSync(target, content);
}

function makeGitFixture(files, environment = process.env) {
  const root = mkdtempSync(path.join(tmpdir(), "docita-check-"));
  execFileSync("git", ["init", "-q"], { cwd: root, env: withoutGitEnvironment(environment) });
  for (const [file, content] of Object.entries(files)) {
    write(root, file, content);
  }
  execFileSync("git", ["add", "."], { cwd: root, env: withoutGitEnvironment(environment) });
  return root;
}

function runCheck(root, name, args = [], env = {}) {
  return spawnSync(NODE, [script(name), ...args], {
    cwd: root,
    encoding: "utf8",
    env: withoutGitEnvironment({ ...process.env, DOCITA_CHECK_ROOT: root, ...env }),
  });
}

function expectPass(result) {
  assert.equal(result.status, 0, result.stderr || result.stdout);
}

function expectFail(result) {
  assert.notEqual(result.status, 0, "expected check to fail");
}

test("check-no-emoji rejects pictographic emoji in source and passes clean files", () => {
  expectFail(
    runCheck(
      makeGitFixture({
        "apps/app/src/x.ts": 'const s = "🦄";',
      }),
      "check-no-emoji.mjs",
      ["--enforce"],
    ),
  );
  expectPass(
    runCheck(
      makeGitFixture({
        "apps/app/src/x.ts": "const s = 'ok';",
      }),
      "check-no-emoji.mjs",
      ["--enforce"],
    ),
  );
});

test("check-tailwind-raw-color rejects raw hex classNames and passes token classes", () => {
  expectFail(
    runCheck(
      makeGitFixture({
        "apps/app/src/x.tsx": "const cls = 'text-[#ff0000]';",
      }),
      "check-tailwind-raw-color.mjs",
      ["--enforce"],
    ),
  );
  expectPass(
    runCheck(
      makeGitFixture({
        "apps/app/src/x.tsx": "const cls = 'text-primary';",
      }),
      "check-tailwind-raw-color.mjs",
      ["--enforce"],
    ),
  );
});

test("check-token-typography rejects ad-hoc text-[Npx] classes", () => {
  expectFail(
    runCheck(
      makeGitFixture({
        "apps/app/src/x.tsx": "const cls = 'text-[13px]';",
      }),
      "check-token-typography.mjs",
      ["--enforce"],
    ),
  );
  expectPass(
    runCheck(
      makeGitFixture({
        "apps/app/src/x.tsx": "const cls = 'text-sm';",
      }),
      "check-token-typography.mjs",
      ["--enforce"],
    ),
  );
});

test("check-as-cast-density fails on a file with as-casts and passes clean files", () => {
  expectFail(
    runCheck(
      makeGitFixture({
        "apps/app/src/x.ts": "const y = value as string;",
      }),
      "check-as-cast-density.mjs",
      ["--enforce"],
    ),
  );
  expectPass(
    runCheck(
      makeGitFixture({
        "apps/app/src/x.ts": "const y: string = value;",
      }),
      "check-as-cast-density.mjs",
      ["--enforce"],
    ),
  );
});

test("check-empty-catches rejects empty catch blocks", () => {
  expectFail(
    runCheck(
      makeGitFixture({
        "apps/api/src/x.ts": "try { a(); } catch {}\n",
      }),
      "check-empty-catches.mjs",
      ["--enforce"],
    ),
  );
  expectPass(
    runCheck(
      makeGitFixture({
        "apps/api/src/x.ts": "try { a(); } catch (e) { logger.error(e); }",
      }),
      "check-empty-catches.mjs",
      ["--enforce"],
    ),
  );
});

test("check-detached-promises rejects void this calls without .catch", () => {
  expectFail(
    runCheck(
      makeGitFixture({
        "apps/api/src/x.ts": "void this.runAsync();",
      }),
      "check-detached-promises.mjs",
      ["--enforce"],
    ),
  );
  expectPass(
    runCheck(
      makeGitFixture({
        "apps/api/src/x.ts": "void this.runAsync().catch((e) => this.logger.error(e));",
      }),
      "check-detached-promises.mjs",
      ["--enforce"],
    ),
  );
});
