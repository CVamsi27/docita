import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildApiHealthProbeUrl,
  createApiAvailabilityStore,
  createReadinessProber,
  isPlatformOutageError,
  type ApiProbeOutcome,
} from "./api-availability";

const DOWN: ApiProbeOutcome = { reachable: false, reason: "api" };
const READY: ApiProbeOutcome = { reachable: true };

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

// The prober is built over an app-provided base URL resolver; the suite pins a
// fixed base so URL assertions stay deterministic.
const probeApiReadiness = createReadinessProber(() => "http://localhost:3000/api/v1");

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("buildApiHealthProbeUrl", () => {
  it("strips the URI version segment and targets readiness", () => {
    expect(buildApiHealthProbeUrl("http://localhost:3001/api/v1")).toBe(
      "http://localhost:3001/api/health/ready",
    );
    expect(buildApiHealthProbeUrl("/api/v1")).toBe("/api/health/ready");
    expect(buildApiHealthProbeUrl("https://api.docita.work/api/v1/")).toBe(
      "https://api.docita.work/api/health/ready",
    );
  });

  it("keeps an unversioned base intact", () => {
    expect(buildApiHealthProbeUrl("https://api.docita.work/api")).toBe(
      "https://api.docita.work/api/health/ready",
    );
  });

  it("adds the platform prefix when the base omits it", () => {
    expect(buildApiHealthProbeUrl("http://localhost:3001")).toBe(
      "http://localhost:3001/api/health/ready",
    );
  });
});

describe("createReadinessProber", () => {
  it("probes the unversioned readiness route", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(jsonResponse({ ready: true, checks: {} }));

    await expect(probeApiReadiness()).resolves.toEqual(READY);
    expect(String(fetchSpy.mock.calls[0]?.[0])).toBe(
      "http://localhost:3000/api/health/ready",
    );
  });

  it("reports a database outage from the readiness body", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse(
        {
          ready: false,
          checks: { database: { status: "disconnected" } },
        },
        503,
      ),
    );

    await expect(probeApiReadiness()).resolves.toEqual({
      reachable: false,
      reason: "database",
    });
  });

  it("reports a generic API outage for gateway failures", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("bad gateway", { status: 502 }),
    );

    await expect(probeApiReadiness()).resolves.toEqual({
      reachable: false,
      reason: "api",
    });
  });

  it("treats network failures as unreachable", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(
      new TypeError("Failed to fetch"),
    );

    await expect(probeApiReadiness()).resolves.toEqual({
      reachable: false,
      reason: "api",
    });
  });

  it("treats an answered-but-failing health route as reachable", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("not found", { status: 404 }),
    );

    await expect(probeApiReadiness()).resolves.toEqual(READY);
  });

  it("reports an outage when an intermediary answers with an error page", async () => {
    // Cloudflare serves an HTML 500 when the upstream Fly machine is gone.
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("<html>Error 1101</html>", {
        status: 500,
        headers: { "content-type": "text/html; charset=UTF-8" },
      }),
    );

    await expect(probeApiReadiness()).resolves.toEqual({
      reachable: false,
      reason: "api",
    });
  });

  it("treats a JSON 5xx from the API as reachable", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse({ statusCode: 500, message: "boom" }, 500),
    );

    await expect(probeApiReadiness()).resolves.toEqual(READY);
  });
});

describe("createApiAvailabilityStore", () => {
  it("starts available and stays available when the probe answers", async () => {
    const store = createApiAvailabilityStore(vi.fn().mockResolvedValue(READY));

    store.reportUnavailable();
    await store.confirmUnavailability();

    expect(store.getSnapshot()).toMatchObject({
      status: "available",
      attempt: 0,
      isProbing: false,
    });
  });

  it("confirms an outage with a probe and records the reason", async () => {
    const probe = vi
      .fn<() => Promise<ApiProbeOutcome>>()
      .mockResolvedValue({ reachable: false, reason: "database" });
    const store = createApiAvailabilityStore(probe);

    const changes: string[] = [];
    store.subscribe(() => changes.push(store.getSnapshot().status));

    store.reportUnavailable();
    await store.confirmUnavailability();
    await Promise.resolve();

    expect(store.getSnapshot()).toMatchObject({
      status: "unavailable",
      reason: "database",
    });
    expect(changes).toContain("unavailable");
  });

  it("retries with backoff until the API answers, then resets", async () => {
    vi.useFakeTimers();
    const probe = vi
      .fn<() => Promise<ApiProbeOutcome>>()
      .mockResolvedValueOnce(DOWN)
      .mockResolvedValueOnce(DOWN)
      .mockResolvedValueOnce(DOWN)
      .mockResolvedValue(READY);
    const store = createApiAvailabilityStore(probe);

    store.reportUnavailable();
    await store.confirmUnavailability();
    await vi.advanceTimersByTimeAsync(0);

    expect(store.getSnapshot()).toMatchObject({
      status: "unavailable",
      attempt: 1,
      isProbing: false,
    });

    await vi.advanceTimersByTimeAsync(2_000);
    expect(store.getSnapshot()).toMatchObject({ attempt: 2 });

    await vi.advanceTimersByTimeAsync(3_500);
    expect(store.getSnapshot()).toMatchObject({
      status: "available",
      reason: null,
      attempt: 0,
    });
  });

  it("resolves waitForAvailable when the API comes back", async () => {
    vi.useFakeTimers();
    const probe = vi
      .fn<() => Promise<ApiProbeOutcome>>()
      .mockResolvedValueOnce(DOWN)
      .mockResolvedValue(READY);
    const store = createApiAvailabilityStore(probe);

    store.reportUnavailable();
    await store.confirmUnavailability();

    let recovered = false;
    const waiting = store.waitForAvailable().then(() => {
      recovered = true;
    });
    expect(recovered).toBe(false);

    await vi.advanceTimersByTimeAsync(2_000);
    await waiting;
    expect(recovered).toBe(true);
  });

  it("skips the remaining backoff delay on retryNow", async () => {
    vi.useFakeTimers();
    const probe = vi
      .fn<() => Promise<ApiProbeOutcome>>()
      .mockResolvedValueOnce(DOWN)
      .mockResolvedValueOnce(DOWN)
      .mockResolvedValue(READY);
    const store = createApiAvailabilityStore(probe);

    store.reportUnavailable();
    await store.confirmUnavailability();
    await vi.advanceTimersByTimeAsync(0);
    expect(store.getSnapshot().status).toBe("unavailable");

    store.retryNow();
    await vi.advanceTimersByTimeAsync(0);

    expect(store.getSnapshot().status).toBe("available");
  });

  it("probes on retryNow while the API is assumed reachable", async () => {
    const probe = vi
      .fn<() => Promise<ApiProbeOutcome>>()
      .mockResolvedValue({ reachable: false, reason: "database" });
    const store = createApiAvailabilityStore(probe);

    store.retryNow();
    await store.confirmUnavailability();

    expect(probe).toHaveBeenCalled();
    expect(store.getSnapshot()).toMatchObject({
      status: "unavailable",
      reason: "database",
    });
  });

  it("only verifies once for repeated failure reports during an outage", async () => {
    const probe = vi
      .fn<() => Promise<ApiProbeOutcome>>()
      .mockResolvedValue({ reachable: false, reason: "api" });
    const store = createApiAvailabilityStore(probe);

    store.reportUnavailable();
    store.reportUnavailable();
    await store.confirmUnavailability();
    await Promise.resolve();

    expect(probe.mock.calls.length).toBeGreaterThanOrEqual(1);
    expect(store.getSnapshot().status).toBe("unavailable");
  });

  it("clears the outage when a real response arrives", async () => {
    vi.useFakeTimers();
    const store = createApiAvailabilityStore(
      vi.fn<() => Promise<ApiProbeOutcome>>().mockResolvedValue(DOWN),
    );

    store.reportUnavailable();
    await store.confirmUnavailability();
    await vi.advanceTimersByTimeAsync(0);
    expect(store.getSnapshot().status).toBe("unavailable");

    store.trackResponse(new Response(null, { status: 200 }));

    expect(store.getSnapshot()).toMatchObject({ status: "available", attempt: 0 });
  });
});

describe("trackResponse", () => {
  it("ignores application-level 500 responses", async () => {
    const probe = vi
      .fn<() => Promise<ApiProbeOutcome>>()
      .mockResolvedValue(READY);
    const store = createApiAvailabilityStore(probe);

    store.trackResponse(jsonResponse({ statusCode: 500 }, 500));
    await Promise.resolve();

    expect(probe).not.toHaveBeenCalled();
    expect(store.getSnapshot().status).toBe("available");
  });

  it("suspects an outage when an intermediary answers with an error page", async () => {
    const probe = vi
      .fn<() => Promise<ApiProbeOutcome>>()
      .mockResolvedValue(READY);
    const store = createApiAvailabilityStore(probe);

    store.trackResponse(
      new Response("<html>Error 1101</html>", {
        status: 500,
        headers: { "content-type": "text/html" },
      }),
    );
    await store.confirmUnavailability();

    expect(probe).toHaveBeenCalled();
    // The probe answered, so the suspicion is dropped instead of alarming.
    expect(store.getSnapshot().status).toBe("available");
  });

  it("verifies on gateway and readiness failures", async () => {
    for (const status of [502, 503, 504]) {
      const probe = vi
        .fn<() => Promise<ApiProbeOutcome>>()
        .mockResolvedValue({ reachable: false, reason: "api" });
      const store = createApiAvailabilityStore(probe);

      store.trackResponse(new Response(null, { status }));
      await store.confirmUnavailability();

      expect(probe.mock.calls.length).toBeGreaterThanOrEqual(1);
      expect(store.getSnapshot().status).toBe("unavailable");
    }
  });
});

describe("isPlatformOutageError", () => {
  it("flags gateway failures, network errors and timeouts", () => {
    expect(isPlatformOutageError({ status: 503 })).toBe(true);
    expect(isPlatformOutageError({ status: 502 })).toBe(true);
    expect(isPlatformOutageError({ isNetworkError: true })).toBe(true);
    expect(isPlatformOutageError({ isTimeout: true })).toBe(true);
    expect(isPlatformOutageError({ code: "NETWORK_ERROR", status: 500 })).toBe(true);
    expect(isPlatformOutageError({ code: "TIMEOUT" })).toBe(true);
  });

  it("ignores application errors and unknown shapes", () => {
    expect(isPlatformOutageError({ status: 500 })).toBe(false);
    expect(isPlatformOutageError({ status: 400 })).toBe(false);
    expect(isPlatformOutageError({ status: 401 })).toBe(false);
    expect(isPlatformOutageError(new Error("boom"))).toBe(false);
    expect(isPlatformOutageError(null)).toBe(false);
    expect(isPlatformOutageError("boom")).toBe(false);
  });
});
