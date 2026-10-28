import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@/test-utils";
import { PerformancePage } from "./performance-page";
import { apiGet } from "@/lib/api/api-client";

vi.mock("@/lib/api/api-client", () => ({
  apiGet: vi.fn(),
}));

const mockApiGet = vi.mocked(apiGet);

const mockPayload = {
  window: {
    startInclusive: "2026-09-02T12:00:00.000Z",
    endExclusive: "2026-10-02T12:00:00.000Z",
    days: 30,
  },
  activity: {
    clinicsWithAppointments: 2,
    appointments: 100,
    completedAppointments: 80,
    invoices: 70,
    jobs: 30,
    failedJobs: 1,
  },
  telemetry: {
    samples: 200,
    serverErrors: 3,
    errorRatePercent: 1.5,
    p50Ms: 100,
    p95Ms: 420,
    firstSampleAt: "2026-09-29T12:00:00.000Z",
    lastSampleAt: "2026-10-02T11:00:00.000Z",
  },
};

describe("PerformancePage", () => {
  beforeEach(() => {
    mockApiGet.mockReset();
  });

  it("renders measured telemetry and activity without an invented baseline", async () => {
    mockApiGet.mockResolvedValueOnce(mockPayload);
    render(<PerformancePage />);
    await screen.findByText("420 ms");
    expect(mockApiGet).toHaveBeenCalledWith(
      "/api/internal/operational-metrics",
    );
    expect(screen.getByText("1.50 %")).toBeInTheDocument();
    expect(screen.queryByText(/from baseline/i)).not.toBeInTheDocument();
    expect(screen.getByText("Clinics with appointments")).toBeInTheDocument();
    expect(
      screen.getByText("Request samples (legacy scope)"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Legacy telemetry: request scope and latency-validity rules are unconfirmed.",
      ),
    ).toBeInTheDocument();
  });
  it("shows unavailable latency and error rate when there are no samples", async () => {
    mockApiGet.mockResolvedValueOnce({
      ...mockPayload,
      telemetry: {
        ...mockPayload.telemetry,
        samples: 0,
        serverErrors: 0,
        p50Ms: null,
        p95Ms: null,
        errorRatePercent: null,
        firstSampleAt: null,
        lastSampleAt: null,
      },
    });
    render(<PerformancePage />);
    await screen.findByText(/No retained request samples/);
    for (const name of [
      "Median response time",
      "p95 response time",
      "Server error rate",
    ]) {
      const card = screen.getByText(name).closest('[data-slot="card"]');
      if (!(card instanceof HTMLElement))
        throw new Error("Metric card is missing.");
      expect(within(card).getByText("Unavailable")).toBeInTheDocument();
    }
    expect(screen.getByText(/No retained request samples/)).toBeInTheDocument();
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
    expect(
      screen.getByRole("button", { name: /try again/i }),
    ).toBeInTheDocument();
  });

  it("re-fetches when Refresh is clicked", async () => {
    mockApiGet.mockResolvedValue(mockPayload);
    render(<PerformancePage />);

    await waitFor(() => {
      expect(screen.getByText("420 ms")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /Refresh/ }));

    await waitFor(() => {
      expect(mockApiGet).toHaveBeenCalledTimes(2);
    });
  });

  it("renders versioned customer telemetry and distinct activity counts", async () => {
    mockApiGet.mockResolvedValueOnce({
      ...mockPayload,
      definitionVersion: 2,
      activity: {
        ...mockPayload.activity,
        prescriptionsCreated: 70,
        clinicPatientsSeen: 60,
      },
      telemetry: {
        ...mockPayload.telemetry,
        requestScope: "CUSTOMER",
        p99Ms: 900,
        validLatencySamples: 197,
        invalidLatencySamples: 3,
      },
    });
    render(<PerformancePage />);
    await screen.findByText("900 ms");
    expect(screen.getByText("Customer request samples")).toBeInTheDocument();
    expect(screen.getByText("Prescriptions created")).toBeInTheDocument();
    expect(screen.getByText("Clinic-patients seen")).toBeInTheDocument();
    expect(screen.getByText("Valid latency samples")).toBeInTheDocument();
    expect(screen.getByText("Invalid latency samples")).toBeInTheDocument();
    expect(
      screen.getByText(/Customer requests by observed completion time/i),
    ).toBeInTheDocument();
    expect(screen.queryByText(/legacy scope/i)).not.toBeInTheDocument();
  });
});
