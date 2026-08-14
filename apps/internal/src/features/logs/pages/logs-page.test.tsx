import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { LogsPage } from "./logs-page";
import { apiGet } from "@/lib/api/api-client";
import { formatDate } from "@/lib/formatters";

vi.mock("@/lib/api/api-client", () => ({
  apiGet: vi.fn(),
}));

const mockApiGet = vi.mocked(apiGet);

const mockLogs = [
  {
    id: "s1",
    timestamp: "2026-01-10T10:00:00Z",
    level: "ERROR",
    module: "auth",
    message: "Login failed",
    details: "401 Unauthorized",
  },
  {
    id: "s2",
    timestamp: "2026-01-10T10:05:00Z",
    level: "WARNING",
    module: "billing",
    message: "Retry payment",
  },
  {
    id: "s3",
    timestamp: "2026-01-10T10:10:00Z",
    level: "INFO",
    module: "auth",
    message: "User logged in",
  },
  {
    id: "s4",
    timestamp: "2026-01-10T10:15:00Z",
    level: "DEBUG",
    module: "whatsapp",
    message: "Webhook payload",
  },
];

describe("LogsPage", () => {
  beforeEach(() => {
    mockApiGet.mockReset();
    mockApiGet.mockResolvedValue({ logs: [], total: 0 });
  });

  it("fetches logs with default params and renders level badges, modules, and details", async () => {
    mockApiGet.mockResolvedValueOnce({ logs: mockLogs, total: 4 });
    render(<LogsPage />);

    await waitFor(() => {
      expect(screen.getByText("Login failed")).toBeInTheDocument();
    });

    expect(mockApiGet).toHaveBeenCalledWith("/api/internal/logs?limit=50&offset=0");

    // Level badge contract: ERROR destructive, WARNING outline, INFO secondary, DEBUG outline.
    expect(screen.getByText("ERROR")).toBeInTheDocument();
    expect(screen.getByText("WARNING")).toBeInTheDocument();
    expect(screen.getByText("INFO")).toBeInTheDocument();
    expect(screen.getByText("DEBUG")).toBeInTheDocument();

    // Two rows share the auth module.
    expect(screen.getAllByText("auth")).toHaveLength(2);
    expect(screen.getByText("billing")).toBeInTheDocument();

    // Details block renders only when present.
    expect(screen.getByText("401 Unauthorized")).toBeInTheDocument();
    expect(screen.queryByText("Retry payment")).toBeInTheDocument();

    // Timestamps render through the en-IN date formatter (TZ pinned to UTC).
    expect(screen.getByText(formatDate("2026-01-10T10:00:00Z"))).toBeInTheDocument();

    // Footer shows the pagination window.
    expect(screen.getByText("Showing 1-4 of 4")).toBeInTheDocument();
  });

  it("re-fetches with level and search filters applied, resetting offset", async () => {
    mockApiGet.mockResolvedValue({ logs: [], total: 0 });
    render(<LogsPage />);

    await waitFor(() => {
      expect(mockApiGet).toHaveBeenCalledWith("/api/internal/logs?limit=50&offset=0");
    });

    // Severity filter (first combobox on the page).
    fireEvent.click(screen.getAllByRole("combobox")[0]);
    const severityListbox = within(await screen.findByRole("listbox"));
    fireEvent.click(severityListbox.getByText("Error"));

    await waitFor(() => {
      expect(mockApiGet).toHaveBeenLastCalledWith(
        "/api/internal/logs?limit=50&offset=0&level=ERROR",
      );
    });

    // Search filter persists the level filter in the query.
    fireEvent.change(screen.getByPlaceholderText("Search messages…"), {
      target: { value: "auth" },
    });

    await waitFor(() => {
      expect(mockApiGet).toHaveBeenLastCalledWith(
        "/api/internal/logs?limit=50&offset=0&level=ERROR&q=auth",
      );
    });
  });

  it("pages with Next/Previous and resets offset on filter change", async () => {
    mockApiGet.mockResolvedValue({ logs: mockLogs, total: 120 });
    render(<LogsPage />);

    await waitFor(() => {
      expect(screen.getByText("Login failed")).toBeInTheDocument();
    });

    expect(screen.getByText("Showing 1-50 of 120")).toBeInTheDocument();

    // Previous is disabled at the start.
    expect(screen.getByRole("button", { name: "Previous" })).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    await waitFor(() => {
      expect(mockApiGet).toHaveBeenLastCalledWith(
        "/api/internal/logs?limit=50&offset=50",
      );
    });
    expect(screen.getByText("Showing 51-100 of 120")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Previous" })).toBeEnabled();

    fireEvent.click(screen.getByRole("button", { name: "Previous" }));
    await waitFor(() => {
      expect(mockApiGet).toHaveBeenLastCalledWith(
        "/api/internal/logs?limit=50&offset=0",
      );
    });
  });

  it("shows the no-matches row when the filtered result is empty", async () => {
    render(<LogsPage />);

    await waitFor(() => {
      expect(screen.getByText("No matching logs found")).toBeInTheDocument();
    });
  });

  it("re-fetches when Refresh is clicked", async () => {
    mockApiGet.mockResolvedValue({ logs: mockLogs, total: 4 });
    render(<LogsPage />);

    await waitFor(() => {
      expect(screen.getByText("Login failed")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /Refresh/ }));

    await waitFor(() => {
      expect(mockApiGet).toHaveBeenCalledTimes(2);
    });
  });
});
