import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const SCRIPT_PATH = fileURLToPath(
  new URL("./run-daily-worker.sh", import.meta.url),
);

function runWorker({
  machines = [{ id: "worker1", state: "stopped" }],
  args = ["2"],
  app = "docita-worker",
  config = `app = '${app}'\nprimary_region = 'sin'\n`,
  scenario = {},
} = {}) {
  const root = mkdtempSync(path.join(tmpdir(), "docita-worker-drain-"));
  const bin = path.join(root, "bin");
  const script = path.join(root, "scripts/deploy/run-daily-worker.sh");
  const statePath = path.join(root, "machines.json");
  const eventsPath = path.join(root, "events.jsonl");
  mkdirSync(path.dirname(script), { recursive: true });
  mkdirSync(path.join(root, "apps/worker"), { recursive: true });
  mkdirSync(bin);
  copyFileSync(SCRIPT_PATH, script);
  writeFileSync(path.join(root, "apps/worker/fly.toml"), config);
  writeFileSync(statePath, JSON.stringify(machines));
  writeFileSync(eventsPath, "");

  // Replace only the external command boundary; execute the real Bash script.
  const boundary = `#!${process.execPath}
import { appendFileSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
const args = process.argv.slice(2);
const command = path.basename(process.argv[1]);
const scenario = JSON.parse(process.env.FAKE_WORKER_SCENARIO);
appendFileSync(process.env.FAKE_WORKER_EVENTS, JSON.stringify({ command, args }) + '\\n');
if (command === 'sleep') {
  if (scenario.signalDuringSleep) process.kill(process.ppid, scenario.signalDuringSleep);
  process.exit(scenario.sleepStatus ?? 0);
}
const machines = JSON.parse(readFileSync(process.env.FAKE_WORKER_STATE, 'utf8'));
const action = args[1];
if (action === 'list') {
  if (scenario.listStatus) process.exit(scenario.listStatus);
  process.stdout.write(scenario.inventoryText ?? JSON.stringify(machines));
} else if (action === 'start' || action === 'stop') {
  if (scenario[action + 'Status']) process.exit(scenario[action + 'Status']);
  const machine = machines.find(machine => machine.id === args[2]);
  if (!machine) process.exit(98);
  machine.state = action === 'start' ? 'started' : 'stopped';
  writeFileSync(process.env.FAKE_WORKER_STATE, JSON.stringify(machines));
  if (action === 'start' && scenario.signalDuringStart) {
    process.kill(process.ppid, scenario.signalDuringStart);
  }
} else if (action === 'wait') {
  process.exit(scenario.waitStatus ?? 0);
} else {
  process.stderr.write('Unexpected fake Fly command\\n');
  process.exit(97);
}
`;
  for (const name of ["flyctl", "sleep"]) {
    writeFileSync(path.join(bin, name), boundary, { mode: 0o755 });
  }

  try {
    const result = spawnSync("/bin/bash", [script, ...args], {
      cwd: tmpdir(),
      encoding: "utf8",
      timeout: 5_000,
      env: {
        PATH: `${bin}:/usr/bin:/bin`,
        FAKE_WORKER_SCENARIO: JSON.stringify(scenario),
        FAKE_WORKER_STATE: statePath,
        FAKE_WORKER_EVENTS: eventsPath,
      },
    });
    assert.equal(result.error, undefined, result.error?.message);
    return {
      ...result,
      machines: JSON.parse(readFileSync(statePath, "utf8")),
      events: readFileSync(eventsPath, "utf8")
        .trim()
        .split("\n")
        .filter(Boolean)
        .map((line) => JSON.parse(line)),
      configPath: path.join(root, "apps/worker/fly.toml"),
    };
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

function lifecycleEvents(result, action) {
  return result.events.filter((event) => event.args[1] === action);
}

test("leaves an already-running worker running without starting a drain window", () => {
  const result = runWorker({ machines: [{ id: "worker1", state: "started" }] });
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(result.machines, [{ id: "worker1", state: "started" }]);
  assert.equal(lifecycleEvents(result, "start").length, 0);
  assert.equal(lifecycleEvents(result, "stop").length, 0);
  assert.equal(
    result.events.filter((event) => event.command === "sleep").length,
    0,
  );
});

test("starts a stopped worker, waits for readiness, and gracefully stops its own run", () => {
  const result = runWorker();
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(result.machines, [{ id: "worker1", state: "stopped" }]);
  assert.deepEqual(
    result.events.map((event) =>
      event.command === "sleep" ? "sleep" : event.args[1],
    ),
    ["list", "start", "wait", "sleep", "stop"],
  );
  assert.deepEqual(
    result.events.find((event) => event.command === "sleep").args,
    ["120"],
  );
  const stopArgs = lifecycleEvents(result, "stop")[0].args;
  assert.equal(stopArgs[2], "worker1");
  assert.equal(stopArgs[stopArgs.indexOf("--signal") + 1], "SIGTERM");
  assert.equal(stopArgs[stopArgs.indexOf("--timeout") + 1], "30");
});

test("does not stop a machine after the start request fails", () => {
  const result = runWorker({ scenario: { startStatus: 31 } });
  assert.equal(result.status, 31);
  assert.equal(lifecycleEvents(result, "stop").length, 0);
  assert.deepEqual(result.machines, [{ id: "worker1", state: "stopped" }]);
});

test("fails and stops its own machine when readiness never succeeds", () => {
  const result = runWorker({ scenario: { waitStatus: 32 } });
  assert.equal(result.status, 32);
  assert.equal(lifecycleEvents(result, "stop").length, 1);
  assert.equal(
    result.events.filter((event) => event.command === "sleep").length,
    0,
  );
});

test("reports stop failure as a failed run without claiming the worker stopped", () => {
  const result = runWorker({ scenario: { stopStatus: 33 } });
  assert.equal(result.status, 33);
  assert.deepEqual(result.machines, [{ id: "worker1", state: "started" }]);
  assert.doesNotMatch(
    result.stdout,
    /Worker stopped|Zero compute|Worker machine stopped/i,
  );
  assert.match(result.stderr, /stop/i);
});

test("cleans up an interrupted drain exactly once and returns the signal exit status", () => {
  for (const [signal, status] of [
    ["SIGTERM", 143],
    ["SIGINT", 130],
  ]) {
    const result = runWorker({ scenario: { signalDuringSleep: signal } });
    assert.equal(result.status, status, result.stderr);
    assert.equal(lifecycleEvents(result, "stop").length, 1);
    assert.deepEqual(result.machines, [{ id: "worker1", state: "stopped" }]);
    assert.doesNotMatch(result.stdout, /window completed/i);
  }
});

test("cleans up a successful start interrupted before entering the drain window", () => {
  const result = runWorker({ scenario: { signalDuringStart: "SIGTERM" } });
  assert.equal(result.status, 143);
  assert.equal(lifecycleEvents(result, "stop").length, 1);
  assert.deepEqual(result.machines, [{ id: "worker1", state: "stopped" }]);
  assert.equal(
    result.events.filter((event) => event.command === "sleep").length,
    0,
  );
});

test("preserves the drain error when cleanup also fails", () => {
  const result = runWorker({ scenario: { sleepStatus: 34, stopStatus: 33 } });
  assert.equal(result.status, 34);
  assert.equal(lifecycleEvents(result, "stop").length, 1);
  assert.match(result.stderr, /stop/i);
});

test("refuses empty or ambiguous machine inventories without changing any machine", () => {
  for (const machines of [
    [],
    [
      { id: "worker1", state: "stopped" },
      { id: "worker2", state: "started" },
    ],
  ]) {
    const result = runWorker({ machines });
    assert.notEqual(result.status, 0);
    assert.deepEqual(result.machines, machines);
    assert.equal(lifecycleEvents(result, "start").length, 0);
    assert.equal(lifecycleEvents(result, "stop").length, 0);
  }
});

test("refuses transient or unsupported worker states without lifecycle mutations", () => {
  for (const state of [
    "starting",
    "stopping",
    "suspended",
    "created",
    "destroyed",
  ]) {
    const result = runWorker({ machines: [{ id: "worker1", state }] });
    assert.notEqual(result.status, 0);
    assert.deepEqual(result.machines, [{ id: "worker1", state }]);
    assert.equal(lifecycleEvents(result, "start").length, 0);
    assert.equal(lifecycleEvents(result, "stop").length, 0);
  }
});

test("fails on inventory errors or malformed machine identity without mutations", () => {
  for (const scenario of [
    { listStatus: 35 },
    { inventoryText: "not-json" },
    { inventoryText: "{}" },
    { inventoryText: '[{"id":null,"state":"stopped"}]' },
    { inventoryText: '[{"id":"worker1"}]' },
  ]) {
    const result = runWorker({ scenario });
    assert.notEqual(result.status, 0);
    assert.equal(lifecycleEvents(result, "start").length, 0);
    assert.equal(lifecycleEvents(result, "stop").length, 0);
  }
});

test("rejects invalid durations before calling Fly", () => {
  for (const duration of [
    "",
    "0",
    "-1",
    "16",
    "1.5",
    "01",
    "abc",
    "999999999999999999999999",
  ]) {
    const result = runWorker({ args: [duration] });
    assert.notEqual(result.status, 0, `duration ${JSON.stringify(duration)}`);
    assert.deepEqual(result.events, []);
  }
  const result = runWorker({ args: ["2", "ignored"] });
  assert.notEqual(result.status, 0);
  assert.deepEqual(result.events, []);
});

test("uses the five-minute default and supports the maximum fifteen-minute window", () => {
  for (const [args, seconds] of [
    [[], "300"],
    [["1"], "60"],
    [["15"], "900"],
  ]) {
    const result = runWorker({ args });
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(
      result.events.find((event) => event.command === "sleep").args,
      [seconds],
    );
  }
});

test("reads the app identity from the canonical config independent of working directory", () => {
  const result = runWorker({ app: "stability-worker" });
  assert.equal(result.status, 0, result.stderr);
  for (const event of result.events.filter(
    (event) => event.command === "flyctl",
  )) {
    assert.equal(
      event.args[event.args.indexOf("--app") + 1],
      "stability-worker",
    );
    assert.equal(
      event.args[event.args.indexOf("--config") + 1],
      result.configPath,
    );
  }
});

test("fails before Fly calls if the canonical app identity is missing or ambiguous", () => {
  for (const config of [
    "primary_region = 'sin'\n",
    "app = 'worker-a'\napp = 'worker-b'\n",
    "app = ''\n",
  ]) {
    const result = runWorker({ config });
    assert.notEqual(result.status, 0);
    assert.deepEqual(result.events, []);
  }
});
