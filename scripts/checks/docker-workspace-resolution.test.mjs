import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  rmSync,
  realpathSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const packages = ["auth", "authorization", "db"];

for (const app of ["api", "worker"]) {
  test(`${app} Docker package layout resolves canonical workspace exports`, () => {
    const fixture = mkdtempSync(
      path.join(tmpdir(), "docita-docker-workspace-"),
    );
    try {
      const expected = [];
      for (const name of packages) {
        const manifestText = readFileSync(
          `packages/${name}/package.json`,
          "utf8",
        );
        const manifest = JSON.parse(manifestText);
        const entry = manifest.exports?.["."]?.require ?? manifest.main;
        assert.equal(typeof entry, "string");
        const root = path.join(fixture, "packages", name);
        const entryPath = path.resolve(root, entry);
        mkdirSync(path.dirname(entryPath), { recursive: true });
        writeFileSync(path.join(root, "package.json"), manifestText);
        writeFileSync(entryPath, "");
        expected.push(realpathSync(entryPath));
      }
      const entrypoint = path.join(fixture, "apps", app, "dist", "main.js");
      mkdirSync(path.dirname(entrypoint), { recursive: true });
      writeFileSync(entrypoint, "");

      const dockerfile = readFileSync(`apps/${app}/Dockerfile`, "utf8");
      const recipe = dockerfile.match(
        /RUN mkdir -p \/app\/node_modules\/@workspace[\s\S]*?(?=\n\n)/,
      )?.[0];
      assert.ok(recipe, "Docker runtime workspace package recipe is missing");
      const commands = recipe
        .replace(/^RUN /, "")
        .split("\n")
        .map((line) =>
          line.trim().replace(/\\$/, "").trim().replace(/&&$/, "").trim(),
        )
        // The fixture starts empty; no preexisting root links need removal.
        .filter((line) => line && !line.startsWith("rm "))
        .map((line) =>
          line.replaceAll("/app", `'${fixture.replaceAll("'", "'\\''")}'`),
        );
      execFileSync("/bin/sh", ["-c", commands.join(" && ")]);

      const script = `const { createRequire } = require('node:module');
        const load = createRequire(${JSON.stringify(entrypoint)});
        process.stdout.write(JSON.stringify(${JSON.stringify(packages)}.map(name => load.resolve('@workspace/' + name))));`;
      const resolved = JSON.parse(
        execFileSync(process.execPath, ["-e", script], {
          encoding: "utf8",
          env: { PATH: process.env.PATH },
        }),
      );
      assert.deepEqual(resolved, expected);
    } finally {
      rmSync(fixture, { recursive: true });
    }
  });
}
