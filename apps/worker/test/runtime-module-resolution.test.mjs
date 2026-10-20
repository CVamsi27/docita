import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import test from "node:test";
import { fileURLToPath } from "node:url";

const workerModulePath = fileURLToPath(
  new URL("../dist/api/src/worker.module.js", import.meta.url),
);

test("the compiled worker module graph resolves its declared runtime dependencies", () => {
  assert.ok(
    existsSync(workerModulePath),
    "Build @docita/worker before running its runtime resolution check",
  );
  const inspect = `
    const { WorkerModule } = require(process.argv[1]);
    const visited = new Set();
    const names = [];
    async function walk(input) {
      let item = await input;
      if (item && typeof item.forwardRef === 'function') item = item.forwardRef();
      if (item && typeof item === 'object' && item.module) {
        for (const child of item.imports ?? []) await walk(child);
        item = item.module;
      }
      if (typeof item !== 'function' || visited.has(item)) return;
      visited.add(item);
      names.push(item.name);
      for (const child of Reflect.getMetadata('imports', item) ?? []) await walk(child);
    }
    walk(WorkerModule).then(() => {
      process.stdout.write(JSON.stringify({ moduleNames: names }));
    }).catch(error => {
      process.stderr.write(error instanceof Error ? error.message : 'Worker graph inspection failed');
      process.exitCode = 1;
    });
  `;
  const result = spawnSync(
    process.execPath,
    ["-e", inspect, workerModulePath],
    {
      cwd: tmpdir(),
      encoding: "utf8",
      timeout: 30_000,
      // No NODE_PATH, inherited secrets, provider instantiation or database queries.
      env: {
        PATH: process.env.PATH,
        NODE_ENV: "test",
        WORKER_ENTRYPOINT: "worker",
        ENABLE_SCHEDULERS: "false",
        DATABASE_URL:
          "postgresql://synthetic:synthetic@127.0.0.1:1/runtime_resolution_test",
        JWT_SECRET: "synthetic-runtime-resolution-secret-for-tests",
        ENCRYPTION_KEY: "1".repeat(64),
        APP_URL: "http://localhost:3001",
        NEXT_PUBLIC_APP_URL: "http://localhost:3000",
        NEXT_PUBLIC_API_URL: "http://localhost:3001/api",
        CORS_ORIGINS: "http://localhost:3000",
        QUEUE_BACKEND: "memory",
        STORAGE_PROVIDER: "local",
      },
    },
  );
  assert.equal(result.error, undefined, result.error?.message);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  let graph;
  try {
    graph = JSON.parse(result.stdout);
  } catch {
    assert.fail("Worker graph inspection did not return valid JSON");
  }
  assert.ok(
    graph && typeof graph === "object" && Array.isArray(graph.moduleNames),
  );
  assert.ok(graph.moduleNames.includes("WorkerModule"));
  assert.ok(graph.moduleNames.length > 1);
});
