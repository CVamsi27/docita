import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({
  useAuth: () => ({
    token: null,
    logout: vi.fn(),
  }),
}));

import SuperAdminDashboard from "./page";

function renderWithQueryClient(ui: ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  );
}

describe("admin dashboard page", () => {
  it("renders the overview page", async () => {
    renderWithQueryClient(<SuperAdminDashboard />);

    expect(await screen.findByRole("heading", { name: "Overview" })).toBeInTheDocument();
  });
});
