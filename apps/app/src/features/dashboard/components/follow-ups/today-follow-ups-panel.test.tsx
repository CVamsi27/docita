import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { DataAccessProvider } from "@workspace/data-access";
import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@/test-utils";
import { TodayFollowUpsPanel } from "@/features/dashboard/components/follow-ups/today-follow-ups-panel";

describe("Today due work", () => {
  it("retries an unavailable optional list and distinguishes an empty due list", async () => {
    const fetcher = vi
      .fn()
      .mockRejectedValueOnce(new Error("Unavailable"))
      .mockResolvedValue([]);
    const config = {
      fetcher,
      getClinicId: () => "clinic",
      getClinicTimezone: () => "Asia/Kolkata",
      isTierFeatureEnabled: () => true,
    };
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 } },
    });
    render(
      <DataAccessProvider config={config}>
        <QueryClientProvider client={queryClient}>
          <TodayFollowUpsPanel enabled />
        </QueryClientProvider>
      </DataAccessProvider>,
    );
    expect(
      await screen.findByText("We could not load follow-ups. Try again."),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /try again/i }));
    expect(
      await screen.findByText("No follow-ups due today"),
    ).toBeInTheDocument();
  });
});
