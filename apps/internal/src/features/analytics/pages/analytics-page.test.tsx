import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@/test-utils";
import { apiGet } from "@/lib/api/api-client";
import { AnalyticsPage } from "./analytics-page";

vi.mock("@/lib/api/api-client", () => ({ apiGet: vi.fn() }));

describe("Analytics page availability", () => {
  beforeEach(() => {
    vi.mocked(apiGet).mockReset();
  });

  it("shows an error when billing fails and retries both data sources", async () => {
    let billingFailed = true;
    vi.mocked(apiGet).mockImplementation(async (path) => {
      if (path.includes("billing")) {
        if (billingFailed) throw new Error("billing unavailable");
        return {
          mrr: 1500,
          arr: 18000,
          activeSubscriptions: 1,
          churnRate: 0,
          subscriptionsByTier: {},
          revenueByMonth: [],
        };
      }
      return null;
    });
    render(<AnalyticsPage />);
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "We could not load this analytics view",
    );
    expect(
      screen.queryByText("No revenue data available yet."),
    ).not.toBeInTheDocument();
    const analyticsReads = vi
      .mocked(apiGet)
      .mock.calls.filter(([path]) => path.includes("analytics")).length;
    billingFailed = false;
    fireEvent.click(screen.getByRole("button", { name: /retry|try again/i }));
    expect(await screen.findByText("MRR")).toBeInTheDocument();
    await waitFor(() =>
      expect(
        vi
          .mocked(apiGet)
          .mock.calls.filter(([path]) => path.includes("analytics")).length,
      ).toBeGreaterThan(analyticsReads),
    );
  });
});
