import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, test } from "node:test";

const enabled = process.env.DOCITA_RUN_DOCKER_ARTIFACT_TESTS === "true";
const baseImage =
  process.env.DOCKER_ARTIFACT_TEST_BASE_IMAGE ?? "node:22.22-alpine";

function docker(args, options = {}) {
  return spawnSync("docker", args, {
    encoding: "utf8",
    timeout: 120000,
    ...options,
  });
}

function parseArtifactOutput(output) {
  try {
    return JSON.parse(output);
  } catch {
    assert.fail("Docker artifact probe emitted invalid JSON");
  }
}

function fixtureImage(recipe, files, verify) {
  const root = mkdtempSync(path.join(tmpdir(), "docita-docker-artifact-"));
  const image = `docita-artifact-test:${randomBytes(12).toString("hex")}`;
  try {
    writeFileSync(
      path.join(root, ".dockerignore"),
      readFileSync(".dockerignore"),
    );
    for (const [file, content] of Object.entries(files)) {
      const target = path.join(root, file);
      mkdirSync(path.dirname(target), { recursive: true });
      writeFileSync(target, content);
    }
    writeFileSync(path.join(root, "Dockerfile"), recipe);
    const built = docker([
      "build",
      "--quiet",
      "--network=none",
      "--tag",
      image,
      root,
    ]);
    assert.equal(built.status, 0, built.stderr);
    verify(image);
  } finally {
    docker(["image", "rm", "--force", image]);
    rmSync(root, { recursive: true, force: true });
  }
}

function instructions(source) {
  return source
    .replace(/\\\n\s*/g, " ")
    .split("\n")
    .filter((line) => /^[A-Z]+\s/.test(line));
}

describe("Docker artifact safety", { skip: !enabled }, () => {
  test("Docker excludes private environment files, runtime data, and build recipes at every copied workspace", () => {
    const excludedFiles = [
      ".env",
      ".env.production",
      ".env.git",
      "apps/api/.env",
      "apps/api/.env.production",
      "apps/api/.env.git",
      "apps/worker/.env",
      "apps/worker/.env.local",
      "packages/db/.env",
      "packages/auth/.env.production",
      "packages/db/backups/docita.sql",
      "packages/db/logs/migration.log",
      "uploads/temp/patient.dat",
      "apps/api/uploads/patient.dat",
      "apps/worker/uploads/patient.dat",
      "apps/api/Dockerfile",
      "apps/worker/Dockerfile",
    ];
    const authoredFiles = [
      "apps/api/src/main.ts",
      "apps/worker/src/main.ts",
      "packages/db/prisma/schema.prisma",
      "packages/db/scripts/fixtures/migration-input.sql",
      "apps/api/.env.example",
    ];
    const files = Object.fromEntries([
      ...excludedFiles.map((file) => [
        file,
        "SYNTHETIC_DOCKER_CANARY=owned-fixture-only\n",
      ]),
      ...authoredFiles.map((file) => [file, "authored fixture\n"]),
    ]);
    fixtureImage(`FROM ${baseImage}\nCOPY . /context\n`, files, (image) => {
      const program = `const fs=require('node:fs');
process.stdout.write(JSON.stringify(${JSON.stringify([...excludedFiles, ...authoredFiles])}.filter(file=>fs.existsSync('/context/'+file))));`;
      const executed = docker([
        "run",
        "--rm",
        "--network=none",
        "--entrypoint",
        "node",
        image,
        "-e",
        program,
      ]);
      assert.equal(executed.status, 0, executed.stderr);
      const included = parseArtifactOutput(executed.stdout);
      assert.deepEqual(
        included,
        authoredFiles,
        "Private runtime inputs must never enter build artifacts",
      );
    });
  });

  for (const app of ["api", "worker"]) {
    const runtimeImage =
      process.env[`DOCKER_ARTIFACT_TEST_${app.toUpperCase()}_IMAGE`];

    test(
      `${app} production artifact excludes development tooling and retains generated Prisma and native modules`,
      { skip: !runtimeImage },
      () => {
        const program = `
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { createRequire } = require('node:module');
const retained = fs.readdirSync('/app/node_modules/.pnpm').filter(name => /^(?:braces@|micromatch@|jest@|ts-jest@|@jest\\+|@nestjs\\+cli@)/.test(name));
assert.deepEqual(retained, [], 'Production artifacts must not retain development glob/test/compiler dependencies');
const db = createRequire('/app/packages/db/package.json');
const { Prisma, PrismaClient } = db('@prisma/client');
assert.equal(typeof PrismaClient, 'function');
assert.ok(Prisma.dmmf.datamodel.models.length > 0, 'The generated Prisma data model must survive production dependency installation');
const api = createRequire('/app/apps/api/package.json');
const bcrypt = api('bcrypt');
assert.equal(bcrypt.compareSync('synthetic-artifact-probe', bcrypt.hashSync('synthetic-artifact-probe', 4)), true);
assert.equal(typeof api('@sentry/profiling-node').nodeProfilingIntegration, 'function');
api('sharp')({create:{width:1,height:1,channels:3,background:{r:0,g:0,b:0}}}).png().toBuffer().then(buffer => {
  assert.ok(buffer.length > 0);
  process.stdout.write(JSON.stringify({developmentToolingAbsent:true,generatedPrisma:true,nativeModules:true}));
}).catch(error => {process.stderr.write(error.stack+'\\n');process.exitCode=1;});
`;
        const executed = docker([
          "run",
          "--rm",
          "--platform=linux/amd64",
          "--network=none",
          "--entrypoint",
          "node",
          runtimeImage,
          "-e",
          program,
        ]);
        assert.equal(executed.status, 0, executed.stderr);
        assert.deepEqual(parseArtifactOutput(executed.stdout), {
          developmentToolingAbsent: true,
          generatedPrisma: true,
          nativeModules: true,
        });
      },
    );

    test(`${app} runtime drops package-manager distributions while keeping Node executable`, () => {
      const source = readFileSync(`apps/${app}/Dockerfile`, "utf8");
      const runtime = source.split(/FROM \S+ AS runtime\n/)[1];
      const cleanup = instructions(runtime).filter(
        (instruction) =>
          instruction.startsWith("RUN ") &&
          instruction.includes("/usr/local/lib/node_modules"),
      );
      fixtureImage(
        [
          `FROM ${baseImage}`,
          "RUN mkdir -p /usr/local/lib/node_modules/pnpm && touch /usr/local/bin/pnpm /usr/local/bin/pnpx",
          ...cleanup,
        ].join("\n"),
        {},
        (image) => {
          const paths = [
            "/usr/local/lib/node_modules/npm",
            "/usr/local/lib/node_modules/pnpm",
            "/usr/local/lib/node_modules/corepack",
            "/usr/local/bin/npm",
            "/usr/local/bin/npx",
            "/usr/local/bin/pnpm",
            "/usr/local/bin/pnpx",
            "/usr/local/bin/corepack",
          ];
          const program = `const fs=require('node:fs');process.stdout.write(JSON.stringify({node:process.versions.node,retained:${JSON.stringify(paths)}.filter(file=>fs.existsSync(file))}));`;
          const executed = docker([
            "run",
            "--rm",
            "--network=none",
            "--entrypoint",
            "node",
            image,
            "-e",
            program,
          ]);
          assert.equal(executed.status, 0, executed.stderr);
          const artifact = parseArtifactOutput(executed.stdout);
          assert.match(artifact.node, /^22\./);
          assert.deepEqual(artifact.retained, []);
        },
      );
    });

    test(`${app} compiler heap supports a bounded Docker build environment`, () => {
      const source = readFileSync(`apps/${app}/Dockerfile`, "utf8");
      const deps = source.split(/FROM \S+ AS runtime\n/)[0];
      const environment = instructions(deps).filter((line) =>
        line.startsWith("ENV "),
      );
      fixtureImage(
        [`FROM ${baseImage}`, ...environment].join("\n"),
        {},
        (image) => {
          const program =
            "process.stdout.write(JSON.stringify(require('node:v8').getHeapStatistics().heap_size_limit/1024/1024));";
          const executed = docker([
            "run",
            "--rm",
            "--memory=2800m",
            "--network=none",
            "--entrypoint",
            "node",
            image,
            "-e",
            program,
          ]);
          assert.equal(executed.status, 0, executed.stderr);
          assert.ok(
            parseArtifactOutput(executed.stdout) >= 2048,
            "Nest compilation needs at least a 2 GiB heap within a bounded builder",
          );
        },
      );
    });

    test(`${app} named ownership COPY builds and runs with a non-root artifact owner`, () => {
      const source = readFileSync(`apps/${app}/Dockerfile`, "utf8");
      const runtime = source.split(/FROM \S+ AS runtime\n/)[1];
      assert.ok(runtime, "Runtime stage must be present");
      const recipe = instructions(runtime).filter(
        (instruction) =>
          /^COPY .*--chown=/.test(instruction) ||
          (/^RUN /.test(instruction) &&
            /\b(addgroup|adduser|chown)\b/.test(instruction)) ||
          /^USER /.test(instruction),
      );
      const copies = recipe.filter((instruction) =>
        instruction.startsWith("COPY "),
      );
      assert.ok(copies.length > 0);
      const files = copies.map((instruction) => {
        const sourcePath = instruction.split(/\s+/).at(-2);
        assert.ok(sourcePath.startsWith("/app/"));
        return `${sourcePath}/fixture.js`;
      });
      const build = [
        `FROM ${baseImage} AS deps`,
        ...files.map(
          (file) => `RUN mkdir -p ${path.posix.dirname(file)} && touch ${file}`,
        ),
        `FROM ${baseImage} AS runtime`,
        "WORKDIR /app",
        ...recipe,
      ].join("\n");
      fixtureImage(build, {}, (image) => {
        const program = `const fs=require('node:fs');process.stdout.write(JSON.stringify({uid:process.getuid(),gid:process.getgid(),owners:${JSON.stringify(files)}.map(file=>({uid:fs.statSync(file).uid,gid:fs.statSync(file).gid}))}));`;
        const executed = docker([
          "run",
          "--rm",
          "--network=none",
          "--entrypoint",
          "node",
          image,
          "-e",
          program,
        ]);
        assert.equal(executed.status, 0, executed.stderr);
        const artifact = parseArtifactOutput(executed.stdout);
        assert.ok(artifact.uid > 0, "Runtime must remain non-root");
        for (const owner of artifact.owners) {
          assert.equal(owner.uid, artifact.uid);
          assert.equal(owner.gid, artifact.gid);
        }
      });
    });
  }
});
