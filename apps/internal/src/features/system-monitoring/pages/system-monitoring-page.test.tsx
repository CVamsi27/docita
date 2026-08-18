import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@/test-utils";
import { SystemMonitoringPage } from "./system-monitoring-page";
import { apiGet } from "@/lib/api/api-client";

vi.mock("@/lib/api/api-client", () => ({
  apiGet: vi.fn(),
}));

const mockApiGet = vi.mocked(apiGet);

const healthyPayload = {
  uptime: 7200,
  memoryUsage: { rss: 1024, heapTotal: 100, heapUsed: 45, external: 10 },
  cpuUsage: { user: 10, system: 5 },
  databaseConnected: true,
  lastErrors: 0,
  avgResponseTime: 120,
  requestsLastHour: 500,
  errorsLastHour: 0,
};

const perfPayload = {
  slowestEndpoints: [
    { path: "/api/patients", method: "GET", avgDuration: 1500, maxDuration: 3000, count: 40 },
    { path: "/api/invoices", method: "POST", avgDuration: 200, maxDuration: 400, count: 10 },
  ],
};

const degradedPayload = {
  ...healthyPayload,
  databaseConnected: false,
  errorsLastHour: 5,
};

describe("SystemMonitoringPage", () => {
  beforeEach(() => {
    mockApiGet.mockReset();
    // Route by URL so both parallel calls resolve their own payload regardless
    // of call count (the auto-refresh interval can add calls).
    mockApiGet.mockImplementation((url: string) =>
      Promise.resolve(url.includes("/performance") ? perfPayload : healthyPayload),
    );
  });

  it("fetches health and performance in parallel and renders the overview with derived metrics", async () => {
    render(<SystemMonitoringPage />);

    await waitFor(() => {
      expect(screen.getByText("healthy")).toBeInTheDocument();
    });

    expect(mockApiGet).toHaveBeenCalledWith("/monitoring/health");
    expect(mockApiGet).toHaveBeenCalledWith("/monitoring/performance");

    // Status card: healthy with the success dot.
    expect(screen.getByText("healthy")).toBeInTheDocument();
    // Heap usage: round(45 / 100 * 100) = 45%.
    expect(screen.getByText("45%")).toBeInTheDocument();
    // Endpoints count and uptime card (7200s = 0d 2h).
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText(/0d 2h/)).toBeInTheDocument();

    // Health checks with their derived latency values.
    expect(screen.getByText("API Server")).toBeInTheDocument();
    expect(screen.getByText("Latency: 120ms")).toBeInTheDocument();
    expect(screen.getByText("Database")).toBeInTheDocument();
    expect(screen.getByText("Latency: 500ms")).toBeInTheDocument();
    // Healthy errors check shows no error span.
    expect(screen.queryByText("errors")).not.toBeInTheDocument();
  });

  it("derives degraded status, database down, and error details when unhealthy", async () => {
    mockApiGet.mockImplementation((url: string) =>
      Promise.resolve(url.includes("/performance") ? perfPayload : degradedPayload),
    );
    render(<SystemMonitoringPage />);

    await waitFor(() => {
      expect(screen.getByText("degraded")).toBeInTheDocument();
    });

    // Database check is down with the connection-failed error.
    expect(screen.getByText("Connection failed")).toBeInTheDocument();
    // Errors check is degraded with the count.
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
    const slowLatency = screen.getByText("1500ms");
    expect(slowLatency.className).toContain("text-destructive");
  });

  it("shows uptime and status on the Health tab and static content on Security", async () => {
    render(<SystemMonitoringPage />);

    await waitFor(() => {
      expect(screen.getByText("healthy")).toBeInTheDocument();
    });

    // Health tab: uptime 7200s -> 0d 2h, status badge.
    fireEvent.mouseDown(screen.getByRole("tab", { name: /^Health/ }));
    expect(screen.getByText(/2h/)).toBeInTheDocument();

    // Security tab is static content.
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

    // Auto-refresh toggle.
    const toggle = screen.getByRole("button", { name: "Auto: ON" });
    fireEvent.click(toggle);
    expect(screen.getByRole("button", { name: "Auto: OFF" })).toBeInTheDocument();

    // Manual refresh: initial pair + more calls from refetch.
    fireEvent.click(screen.getByRole("button", { name: /Refresh/ }));
    await waitFor(() => {
      expect(mockApiGet.mock.calls.length).toBeGreaterThanOrEqual(3);
    });
  });
});
