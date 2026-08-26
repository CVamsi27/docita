import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@/test-utils";
import { PerformancePage } from "./performance-page";
import { apiGet } from "@/lib/api/api-client";

vi.mock("@/lib/api/api-client", () => ({
  apiGet: vi.fn(),
}));

const mockApiGet = vi.mocked(apiGet);

const mockPayload = {
  uptimeSeconds: 2592000,
  uptimeFormatted: "99.98%",
  avgResponseTime: 180,
  requestsPerMinute: 420,
  errorsLastHour: 3,
  errorRate: 0.2,
  databaseConnected: true,
};

describe("PerformancePage", () => {
  beforeEach(() => {
    mockApiGet.mockReset();
  });

  it("fetches performance metrics and renders the five derived cards with units", async () => {
    mockApiGet.mockResolvedValueOnce(mockPayload);
    render(<PerformancePage />);

    await waitFor(() => {
      expect(screen.getByText("Avg Response Time")).toBeInTheDocument();
    });

    expect(mockApiGet).toHaveBeenCalledWith("/api/internal/performance");

    // Value + unit composition for each derived card.
    expect(screen.getByText("180 ms")).toBeInTheDocument();
    expect(screen.getByText(/^420\s*$/)).toBeInTheDocument(); // unit-less value
    expect(screen.getByText("0.2 %")).toBeInTheDocument();
    expect(screen.getByText(/^99\.98%\s*$/)).toBeInTheDocument();
    expect(screen.getByText(/^3\s*$/)).toBeInTheDocument();

    // All metrics report 0 change -> neutral baseline line on every card.
    expect(screen.getAllByText("0% from baseline")).toHaveLength(5);
  });

  it("shows an error state with retry when metrics cannot be loaded", async () => {
    mockApiGet.mockRejectedValueOnce(new Error("down"));
    render(<PerformancePage />);

    await waitFor(() => {
      expect(
        screen.getByText(/could not load performance metrics/i),
      ).toBeInTheDocument();
    });

    // The error state offers a retry affordance instead of silent dashes.
    expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
  });

  it("re-fetches when Refresh is clicked", async () => {
    mockApiGet.mockResolvedValue(mockPayload);
    render(<PerformancePage />);

    await waitFor(() => {
      expect(screen.getByText("180 ms")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /Refresh/ }));

    await waitFor(() => {
      expect(mockApiGet).toHaveBeenCalledTimes(2);
    });
  });
});
