import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";
import { DataAccessProvider } from "@workspace/data-access";

vi.mock("@/features/dashboard/use-dashboard-data", () => ({
  useDashboardData: () => ({
    token: "test-token",
    clinics: [],
    stats: {
      clinics: 2,
      users: 10,
      doctors: 4,
      patients: 100,
      invoices: 50,
      prescriptions: 30,
    },
    trends: {
      clinicsThisMonth: 1,
      usersThisMonth: 2,
      doctorsThisMonth: 1,
      patientsThisMonth: 5,
      invoicesPercentChange: 0,
      prescriptionsPercentChange: 0,
    },
    loading: false,
    hasError: false,
    errorMessage: "",
    refetch: vi.fn(),
  }),
}));

import InternalDashboard from "./page";

function renderWithQueryClient(ui: ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <DataAccessProvider
        config={{
          fetcher: (endpoint) =>
            Promise.reject(new Error(`Unexpected data-access GET ${endpoint}`)),
          getClinicId: () => undefined,
          getClinicTimezone: () => undefined,
          isTierFeatureEnabled: () => true,
        }}
      >
        {ui}
      </DataAccessProvider>
    </QueryClientProvider>,
  );
}

describe("internal dashboard page", () => {
  it("renders the overview page", async () => {
    renderWithQueryClient(<InternalDashboard />);

    expect(await screen.findByRole("heading", { name: "Overview" })).toBeInTheDocument();
  });
});
