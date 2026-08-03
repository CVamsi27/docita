import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { renderWithTooltip as render } from "@/test-utils/render-with-tooltip";
import { afterEach, describe, expect, it, vi } from "vitest";

import { GlobalSearch } from "./GlobalSearch";

vi.mock("@workspace/hooks/use-debounce", () => ({
  useDebounce: <T,>(value: T) => value,
}));

const searchGlobalMock = vi.hoisted(() => vi.fn());

vi.mock("@/features/search/api/search.api", () => ({
  searchGlobal: (...args: unknown[]) => searchGlobalMock(...args),
}));

function renderWithClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: 0,
        gcTime: 0,
      },
    },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      {/* use-global-search navigates on result select; provide a Router context. */}
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>,
  );
}

afterEach(() => {
  vi.clearAllMocks();
});

describe("<GlobalSearch /> error state", () => {
  it("surfaces an alert with retry when the search query fails", async () => {
    searchGlobalMock.mockRejectedValueOnce(new Error("Network down"));

    renderWithClient(<GlobalSearch />);

    fireEvent.click(
      screen.getByRole("button", {
        name: /search patients, appointments, and prescriptions/i,
      }),
    );

    await waitFor(() => {
      expect(screen.getByRole("combobox")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByRole("combobox"), {
      target: { value: "Jane" },
    });

    await waitFor(
      () => {
        expect(
          screen.getByTestId("global-search-error"),
        ).toBeInTheDocument();
      },
      { timeout: 1500 },
    );

    expect(
      screen.getByRole("button", { name: /try again/i }),
    ).toBeInTheDocument();
  });
});
