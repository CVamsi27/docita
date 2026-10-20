import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";

// We import the module under test after patching env in each test via the
// helper below, so the `FLY_API_TOKEN` env check works correctly.

const ORIGINAL_ENV = { ...process.env };

function resetEnv() {
  process.env = { ...ORIGINAL_ENV };
}

function importFresh() {
  // Re-evaluate the module so it picks up the current env.
  return import("./fly-recovery.mjs?t=" + Date.now());
}

beforeEach(() => {
  resetEnv();
});

afterEach(() => {
  resetEnv();
});

// ---------------------------------------------------------------------------
// isFlyRecoveryEnabled
// ---------------------------------------------------------------------------

test("isFlyRecoveryEnabled returns false when FLY_API_TOKEN is unset", async () => {
  delete process.env.FLY_API_TOKEN;
  const { isFlyRecoveryEnabled } = await importFresh();
  assert.equal(isFlyRecoveryEnabled(), false);
});

test("isFlyRecoveryEnabled returns false when FLY_API_TOKEN is blank", async () => {
  process.env.FLY_API_TOKEN = "  ";
  const { isFlyRecoveryEnabled } = await importFresh();
  assert.equal(isFlyRecoveryEnabled(), false);
});

test("isFlyRecoveryEnabled returns true when FLY_API_TOKEN is set", async () => {
  process.env.FLY_API_TOKEN = "fo1_test_token_xxx";
  const { isFlyRecoveryEnabled } = await importFresh();
  assert.equal(isFlyRecoveryEnabled(), true);
});

// ---------------------------------------------------------------------------
// shouldAttemptFlyRecovery
// ---------------------------------------------------------------------------

test("shouldAttemptFlyRecovery returns false for null/undefined/empty", async () => {
  const { shouldAttemptFlyRecovery } = await importFresh();
  assert.equal(shouldAttemptFlyRecovery(null), false);
  assert.equal(shouldAttemptFlyRecovery(undefined), false);
  assert.equal(shouldAttemptFlyRecovery(""), false);
});

test("shouldAttemptFlyRecovery matches timeout messages", async () => {
  const { shouldAttemptFlyRecovery } = await importFresh();
  assert.equal(shouldAttemptFlyRecovery("Request timed out after 15000ms"), true);
  assert.equal(shouldAttemptFlyRecovery("[api-health-live] Request timed out after 15000ms"), true);
});

test("shouldAttemptFlyRecovery matches connection refused", async () => {
  const { shouldAttemptFlyRecovery } = await importFresh();
  assert.equal(shouldAttemptFlyRecovery("fetch failed"), true);
  assert.equal(shouldAttemptFlyRecovery("connect ECONNREFUSED 127.0.0.1:3001"), true);
  assert.equal(shouldAttemptFlyRecovery("Connection refused"), true);
});

test("shouldAttemptFlyRecovery matches Fly gateway errors", async () => {
  const { shouldAttemptFlyRecovery } = await importFresh();
  assert.equal(shouldAttemptFlyRecovery("Got 502 from origin"), true);
  assert.equal(shouldAttemptFlyRecovery("Got 503 Service Unavailable"), true);
  assert.equal(shouldAttemptFlyRecovery("Got 504 Gateway Timeout"), true);
  assert.equal(shouldAttemptFlyRecovery("PR01: no known healthy instances"), true);
  assert.equal(shouldAttemptFlyRecovery("socket hang up"), true);
});

test("shouldAttemptFlyRecovery rejects non-recoverable failures", async () => {
  const { shouldAttemptFlyRecovery } = await importFresh();
  assert.equal(shouldAttemptFlyRecovery("Expected 200, got 401"), false);
  assert.equal(shouldAttemptFlyRecovery("Latency 6000ms exceeds 5000ms target"), false);
  assert.equal(shouldAttemptFlyRecovery("Response missing non-empty quote field"), false);
  assert.equal(shouldAttemptFlyRecovery("Unexpected liveness payload"), false);
});

test("TLS certificate failures do not restart a healthy origin process", async () => {
  const { shouldAttemptFlyRecovery } = await importFresh();
  assert.equal(shouldAttemptFlyRecovery("Expected 200, got 525"), false);
  assert.equal(shouldAttemptFlyRecovery("Got 526 Invalid SSL Certificate"), false);
});

// ---------------------------------------------------------------------------
// restartFlyAppMachines (mocked HTTP)
// ---------------------------------------------------------------------------

function withMockedFetch(handlers, fn) {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, options = {}) => {
    for (const handler of handlers) {
      const result = await handler(url, options);
      if (result !== undefined) return result;
    }
    return { ok: false, status: 404 };
  };
  return fn().finally(() => {
    globalThis.fetch = originalFetch;
  });
}

function listMachinesHandler(machines) {
  return (url, options) => {
    if (options?.method === "GET" && url.includes("/machines") && !url.includes("/restart") && !url.includes("/wait")) {
      return { ok: true, json: async () => machines };
    }
  };
}

function okRestartHandler() {
  return (url, options) => {
    if (options?.method === "POST" && url.includes("/restart")) {
      return { ok: true };
    }
  };
}

function okWaitHandler() {
  return (url) => {
    if (url.includes("/wait")) {
      return { ok: true };
    }
  };
}

test("restartFlyAppMachines lists machines and restarts each one", async () => {
  process.env.FLY_API_TOKEN = "fo1_test_token";
  process.env.FLY_API_HOSTNAME = "https://fly.example.test";

  const { restartFlyAppMachines } = await importFresh();

  const machines = [
    { id: "abc123", config: { metadata: { fly_process_group: "app" } } },
    { id: "def456", config: { metadata: { fly_process_group: "app" } } },
  ];

  await withMockedFetch(
    [listMachinesHandler(machines), okRestartHandler(), okWaitHandler()],
    async () => {
      const result = await restartFlyAppMachines({ app: "docita-api", processGroup: "app" });
      assert.equal(result.ok, true);
      assert.deepEqual(result.machineIds, ["abc123", "def456"]);
    },
  );
});

test("restartFlyAppMachines filters by process group", async () => {
  process.env.FLY_API_TOKEN = "fo1_test_token";
  process.env.FLY_API_HOSTNAME = "https://fly.example.test";

  const { restartFlyAppMachines } = await importFresh();

  const machines = [
    { id: "abc123", config: { metadata: { fly_process_group: "app" } } },
    { id: "def456", config: { metadata: { fly_process_group: "worker" } } },
    { id: "ghi789", config: { metadata: { fly_process_group: "app" } } },
  ];

  await withMockedFetch(
    [listMachinesHandler(machines), okRestartHandler(), okWaitHandler()],
    async () => {
      const result = await restartFlyAppMachines({ app: "docita-api", processGroup: "app" });
      assert.equal(result.ok, true);
      assert.deepEqual(result.machineIds, ["abc123", "ghi789"]);
    },
  );
});

test("restartFlyAppMachines returns error when list request fails", async () => {
  process.env.FLY_API_TOKEN = "fo1_test_token";
  process.env.FLY_API_HOSTNAME = "https://fly.example.test";

  const { restartFlyAppMachines } = await importFresh();

  await withMockedFetch(
    [() => ({ ok: false, status: 403 })],
    async () => {
      const result = await restartFlyAppMachines({ app: "docita-api" });
      assert.equal(result.ok, false);
      assert.ok(result.error.includes("403"));
    },
  );
});

test("restartFlyAppMachines returns error when machines payload is null", async () => {
  process.env.FLY_API_TOKEN = "fo1_test_token";
  process.env.FLY_API_HOSTNAME = "https://fly.example.test";

  const { restartFlyAppMachines } = await importFresh();

  await withMockedFetch(
    [
      (url, options) => {
        if (options?.method === "GET" && url.includes("/machines") && !url.includes("/restart") && !url.includes("/wait")) {
          return { ok: true, json: async () => null };
        }
      },
    ],
    async () => {
      const result = await restartFlyAppMachines({ app: "docita-api" });
      assert.equal(result.ok, false);
      assert.ok(result.error.includes("unexpected machines payload"));
    },
  );
});

test("restartFlyAppMachines returns error when no machines found in process group", async () => {
  process.env.FLY_API_TOKEN = "fo1_test_token";
  process.env.FLY_API_HOSTNAME = "https://fly.example.test";

  const { restartFlyAppMachines } = await importFresh();

  await withMockedFetch(
    [listMachinesHandler([])],
    async () => {
      const result = await restartFlyAppMachines({ app: "docita-api", processGroup: "worker" });
      assert.equal(result.ok, false);
      assert.ok(result.error.includes("no machines"));
    },
  );
});

test("restartFlyAppMachines stops and reports partial restart on failure mid-batch", async () => {
  process.env.FLY_API_TOKEN = "fo1_test_token";
  process.env.FLY_API_HOSTNAME = "https://fly.example.test";

  const { restartFlyAppMachines } = await importFresh();

  const machines = [
    { id: "abc123", config: { metadata: { fly_process_group: "app" } } },
    { id: "def456", config: { metadata: { fly_process_group: "app" } } },
  ];

  let restartCount = 0;
  await withMockedFetch(
    [
      listMachinesHandler(machines),
      (url, options) => {
        if (options?.method === "POST" && url.includes("/restart")) {
          restartCount += 1;
          if (restartCount === 2) {
            return { ok: false, status: 500 };
          }
          return { ok: true };
        }
      },
      okWaitHandler(),
    ],
    async () => {
      const result = await restartFlyAppMachines({ app: "docita-api", processGroup: "app" });
      assert.equal(result.ok, false);
      assert.deepEqual(result.machineIds, ["abc123"]);
      assert.ok(result.error.includes("500"));
    },
  );
});

test("restartFlyAppMachines handles network errors gracefully", async () => {
  process.env.FLY_API_TOKEN = "fo1_test_token";
  process.env.FLY_API_HOSTNAME = "https://fly.example.test";

  const { restartFlyAppMachines } = await importFresh();

  await withMockedFetch(
    [() => { throw new Error("fetch failed"); }],
    async () => {
      const result = await restartFlyAppMachines({ app: "docita-api" });
      assert.equal(result.ok, false);
      assert.ok(result.error.includes("fetch failed"));
    },
  );
});
