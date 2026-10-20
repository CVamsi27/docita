import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const hook = fileURLToPath(new URL("../../.husky/pre-push", import.meta.url));
const localGitVariables = execFileSync(
  "git",
  ["rev-parse", "--local-env-vars"],
  {
    encoding: "utf8",
  },
)
  .trim()
  .split("\n");

function isolatedEnvironment() {
  const env = { ...process.env };
  for (const name of localGitVariables) delete env[name];
  return env;
}

for (const failingGate of [false, true]) {
  test(`pre-push isolates foreign Git fixtures and ${failingGate ? "propagates gate failure" : "preserves the caller repository"}`, () => {
    const root = mkdtempSync(path.join(tmpdir(), "docita-hook-isolation-"));
    const caller = path.join(root, "caller");
    const foreign = path.join(root, "foreign.git");
    const bin = path.join(root, "bin");
    const env = isolatedEnvironment();
    const git = (args, cwd = caller) =>
      execFileSync("git", args, { cwd, env, encoding: "utf8" }).trim();
    try {
      mkdirSync(caller);
      mkdirSync(foreign);
      mkdirSync(bin);
      git(["init", "-q"]);
      writeFileSync(
        path.join(bin, "pnpm"),
        `#!/bin/sh
if [ "$1" = "test:standards-checks" ]; then
  cd "$DOCITA_TEST_FOREIGN_GIT" || exit 1
  git init --bare -q
  exit "$DOCITA_TEST_GATE_EXIT"
fi
`,
        { mode: 0o700 },
      );
      const result = spawnSync("/bin/sh", [hook], {
        cwd: caller,
        encoding: "utf8",
        env: {
          ...env,
          PATH: `${bin}${path.delimiter}${env.PATH}`,
          GIT_DIR: path.join(caller, ".git"),
          GIT_INDEX_FILE: path.join(caller, ".git", "index"),
          DOCITA_TEST_FOREIGN_GIT: foreign,
          DOCITA_TEST_GATE_EXIT: failingGate ? "23" : "0",
        },
      });
      assert.equal(result.status, failingGate ? 23 : 0, result.stderr);
      assert.equal(git(["rev-parse", "--is-bare-repository"]), "false");
      assert.equal(
        git([`--git-dir=${foreign}`, "rev-parse", "--is-bare-repository"]),
        "true",
      );
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
}
