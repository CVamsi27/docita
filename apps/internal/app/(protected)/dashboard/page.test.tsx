import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";
import { DataAccessProvider } from "@workspace/data-access";

vi.mock("@/lib/auth/auth", () => ({
  useAuth: () => ({
    token: null,
    logout: vi.fn(),
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

    expect(await screen.findByText("Total Facilities")).toBeInTheDocument();
  });
});
