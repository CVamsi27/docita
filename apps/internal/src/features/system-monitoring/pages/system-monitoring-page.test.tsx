import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@/test-utils";
import { SystemMonitoringPage } from "./system-monitoring-page";
import { apiGet } from "@/lib/api/api-client";
import type {
  PerformanceMetrics,
  QueueHealthSummary,
  SystemHealth,
  TelemetryCoverage,
} from "@workspace/types";

vi.mock("@/lib/api/api-client", () => ({
  apiGet: vi.fn(),
}));

const mockApiGet = vi.mocked(apiGet);

const healthyPayload: SystemHealth = {
  uptime: 7200,
  memoryUsage: { rss: 1024, heapTotal: 100, heapUsed: 45, external: 10 },
  cpuUsage: { user: 10, system: 5 },
  databaseConnected: true,
  lastErrors: 0,
  avgResponseTime: 120,
  requestsLastHour: 500,
  errorsLastHour: 0,
};

const perfPayload: PerformanceMetrics = {
  slowestEndpoints: [
    {
      path: "/api/patients",
      method: "GET",
      avgDuration: 1500,
      maxDuration: 3000,
      count: 40,
    },
    {
      path: "/api/invoices",
      method: "POST",
      avgDuration: 200,
      maxDuration: 400,
      count: 10,
    },
  ],
  responseTimeDistribution: [{ range: "1-2s", count: 40 }],
  throughputByMinute: [{ minute: "2026-10-03T13:10", count: 50 }],
  byRouteCategory: { customer: 50, healthCheck: 900, internal: 4 },
  invalidLatencySamples: 0,
};

const coveragePayload: TelemetryCoverage = {
  windowStart: "2026-10-03T00:00:00.000Z",
  windowEnd: "2026-10-03T23:59:59.000Z",
  state: "COMPLETE",
  firstObservedAt: "2026-10-03T00:00:12.000Z",
  lastObservedAt: "2026-10-03T23:59:40.000Z",
  retainedRequests: 50,
  byRouteCategory: { customer: 50, healthCheck: 900, internal: 4 },
  invalidLatencySamples: 0,
  captureEvents: [],
  droppedRequests: 0,
  coverageNote:
    "Observation coverage is the first and last retained request timestamps plus recorded capture gaps. It is not uptime and proves nothing about periods with no retained rows.",
};

const queuePayload: QueueHealthSummary = {
  countsByStatus: [{ status: "COMPLETED", count: 100 }],
  topQueuesByWaiting: [],
  topQueuesByFailed: [],
  deadLetteredLast24h: 0,
  outcomesLast24h: [
    { outcome: "COMPLETED", count: 90 },
    { outcome: "RETRY_SCHEDULED", count: 6 },
  ],
  jobsRetriedLast24h: 2,
  jobsRecoveredLast24h: 1,
};

const degradedPayload: SystemHealth = {
  ...healthyPayload,
  databaseConnected: false,
  errorsLastHour: 5,
};

/** Route by URL so parallel queries each resolve their own payload. */
function routeByUrl(url: string): unknown {
  if (url.includes("/performance")) return perfPayload;
  if (url.includes("telemetry-coverage")) return coveragePayload;
  if (url.includes("/queue-health")) return queuePayload;
  return healthyPayload;
}

describe("SystemMonitoringPage", () => {
  beforeEach(() => {
    mockApiGet.mockReset();
    mockApiGet.mockImplementation((url: string) =>
      Promise.resolve(routeByUrl(url)),
    );
  });

  it("fetches health, customer-scoped performance, coverage and queue health", async () => {
    render(<SystemMonitoringPage />);

    await waitFor(() => {
      expect(screen.getByText("healthy")).toBeInTheDocument();
    });

    expect(mockApiGet).toHaveBeenCalledWith("/monitoring/health");
    // Probes are excluded server-side, so the page asks for CUSTOMER only.
    expect(mockApiGet).toHaveBeenCalledWith(
      "/monitoring/performance?routeCategory=CUSTOMER",
    );
    expect(mockApiGet).toHaveBeenCalledWith("/monitoring/telemetry-coverage");
    expect(mockApiGet).toHaveBeenCalledWith("/monitoring/queue-health");

    // Status card: healthy with the success dot.
    expect(screen.getByText("healthy")).toBeInTheDocument();
    // Heap usage: round(45 / 100 * 100) = 45%.
    expect(screen.getByText("45%")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();

    // Health checks with their derived latency values.
    expect(screen.getByText("API Server")).toBeInTheDocument();
    expect(screen.getByText("Latency: 120ms")).toBeInTheDocument();
    expect(screen.getByText("Database")).toBeInTheDocument();
    expect(screen.getByText("Latency: 500ms")).toBeInTheDocument();
    expect(screen.queryByText("errors")).not.toBeInTheDocument();
  });

  it("shows telemetry coverage instead of claiming uptime", async () => {
    render(<SystemMonitoringPage />);

    await waitFor(() => {
      expect(screen.getByText("Complete")).toBeInTheDocument();
    });

    // The last retained instant is surfaced; no availability percentage is claimed.
    expect(screen.getByText(/Last retained request/)).toBeInTheDocument();
  });

  it("flags a coverage gap rather than presenting it as healthy", async () => {
    mockApiGet.mockImplementation((url: string) =>
      Promise.resolve(
        url.includes("telemetry-coverage")
          ? { ...coveragePayload, state: "GAPS_RECORDED", droppedRequests: 120 }
          : routeByUrl(url),
      ),
    );
    render(<SystemMonitoringPage />);

    await waitFor(() => {
      expect(screen.getByText("Gaps recorded")).toBeInTheDocument();
    });
  });

  it("derives degraded status, database down, and error details when unhealthy", async () => {
    mockApiGet.mockImplementation((url: string) =>
      Promise.resolve(
        url === "/monitoring/health" ? degradedPayload : routeByUrl(url),
      ),
    );
    render(<SystemMonitoringPage />);

    await waitFor(() => {
      expect(screen.getByText("degraded")).toBeInTheDocument();
    });

    expect(screen.getByText("Connection failed")).toBeInTheDocument();
    expect(screen.getByText("5 errors")).toBeInTheDocument();
  });

  it("renders the slowest endpoints table with latency styling on the Performance tab", async () => {
    render(<SystemMonitoringPage />);

    await waitFor(() => {
      expect(screen.getByText("healthy")).toBeInTheDocument();
    });

    // radix TabsTrigger activates on mouseDown.
    fireEvent.mouseDown(screen.getByRole("tab", { name: /Performance/ }));

    await waitFor(() => {
      expect(screen.getByText("/api/patients")).toBeInTheDocument();
    });

    expect(screen.getByText("GET")).toBeInTheDocument();
    expect(screen.getByText("POST")).toBeInTheDocument();
    expect(screen.getByText("1500ms")).toBeInTheDocument();
    expect(screen.getByText("200ms")).toBeInTheDocument();
    expect(screen.getByText("40")).toBeInTheDocument();
    expect(screen.getByText("10")).toBeInTheDocument();

    // Latency over 1000ms gets the destructive class.
    expect(screen.getByText("1500ms").className).toContain("text-destructive");
    expect(
      screen.getByText(
        /Customer traffic only\. Liveness and readiness probes are excluded\./,
      ),
    ).toBeInTheDocument();
  });

  it("reports excluded latency samples so 'fast' is distinguishable from 'not measured'", async () => {
    mockApiGet.mockImplementation((url: string) =>
      Promise.resolve(
        url.includes("/performance")
          ? { ...perfPayload, invalidLatencySamples: 4 }
          : routeByUrl(url),
      ),
    );
    render(<SystemMonitoringPage />);

    // The tab list only mounts once DataState leaves the loading state.
    await waitFor(() => {
      expect(
        screen.getByRole("tab", { name: /Performance/ }),
      ).toBeInTheDocument();
    });
    fireEvent.mouseDown(screen.getByRole("tab", { name: /Performance/ }));

    await waitFor(() => {
      expect(
        screen.getByText(/4 latency sample\(s\) were out of range/),
      ).toBeInTheDocument();
    });
  });

  it("shows queue execution outcomes and recovered retries on the Traffic tab", async () => {
    render(<SystemMonitoringPage />);

    await waitFor(() => {
      expect(screen.getByRole("tab", { name: /Traffic/ })).toBeInTheDocument();
    });
    fireEvent.mouseDown(screen.getByRole("tab", { name: /Traffic/ }));

    await waitFor(() => {
      expect(screen.getByText("RETRY_SCHEDULED")).toBeInTheDocument();
    });

    expect(screen.getByText("COMPLETED")).toBeInTheDocument();
    expect(
      screen.getByText(/2 job\(s\) retried, 1 recovered/),
    ).toBeInTheDocument();
    // Coverage note travels with the payload, not just the docs.
    expect(screen.getByText(/It is not uptime/)).toBeInTheDocument();
  });

  it("lists recorded capture gaps with their dropped counts", async () => {
    mockApiGet.mockImplementation((url: string) =>
      Promise.resolve(
        url.includes("telemetry-coverage")
          ? {
              ...coveragePayload,
              state: "GAPS_RECORDED",
              droppedRequests: 120,
              captureEvents: [
                {
                  state: "CAPTURE_DISABLED",
                  reason: "DATABASE_AUTH_FAILURE",
                  droppedRequests: 120,
                  bufferedRequests: 0,
                  recordedAt: "2026-10-03T06:00:00.000Z",
                },
              ],
            }
          : routeByUrl(url),
      ),
    );
    render(<SystemMonitoringPage />);

    await waitFor(() => {
      expect(screen.getByRole("tab", { name: /Traffic/ })).toBeInTheDocument();
    });
    fireEvent.mouseDown(screen.getByRole("tab", { name: /Traffic/ }));

    await waitFor(() => {
      expect(screen.getByText("DATABASE_AUTH_FAILURE")).toBeInTheDocument();
    });
    expect(screen.getByText("CAPTURE_DISABLED")).toBeInTheDocument();
  });

  it("shows process uptime on the Health tab, labelled as such", async () => {
    render(<SystemMonitoringPage />);

    await waitFor(() => {
      expect(screen.getByText("healthy")).toBeInTheDocument();
    });

    fireEvent.mouseDown(screen.getByRole("tab", { name: /^Health/ }));
    expect(screen.getByText(/2h/)).toBeInTheDocument();
    expect(
      screen.getByText(
        /Process uptime for this replica\. It is not service availability\./,
      ),
    ).toBeInTheDocument();
  });

  it("keeps static security content", async () => {
    render(<SystemMonitoringPage />);

    await waitFor(() => {
      expect(screen.getByText("healthy")).toBeInTheDocument();
    });

    fireEvent.mouseDown(screen.getByRole("tab", { name: /Security/ }));
    expect(screen.getByText("All systems secure")).toBeInTheDocument();
    expect(
      screen.getByText("No security incidents detected in the last 24 hours."),
    ).toBeInTheDocument();
  });

  it("toggles auto-refresh and re-fetches on manual Refresh", async () => {
    render(<SystemMonitoringPage />);

    await waitFor(() => {
      expect(screen.getByText("healthy")).toBeInTheDocument();
    });

    const toggle = screen.getByRole("button", { name: "Auto: ON" });
    fireEvent.click(toggle);
    expect(
      screen.getByRole("button", { name: "Auto: OFF" }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Refresh/ }));
    await waitFor(() => {
      expect(mockApiGet.mock.calls.length).toBeGreaterThanOrEqual(4);
    });
  });
});
