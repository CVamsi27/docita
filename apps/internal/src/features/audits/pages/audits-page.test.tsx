import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { AuditsPage } from "./audits-page";
import { apiGet } from "@/lib/api/api-client";
import { formatDateTime, enIN } from "@workspace/utils";

vi.mock("@/lib/api/api-client", () => ({
  apiGet: vi.fn(),
}));

const mockApiGet = vi.mocked(apiGet);

const mockLogs = [
  {
    id: "l1",
    createdAt: "2026-01-10T10:00:00Z",
    action: "LOGIN",
    resource: "user",
    resourceId: "u1",
    clinicId: "clinic-1",
    userId: "admin-1",
    status: "SUCCESS",
  },
  {
    id: "l2",
    createdAt: "2026-02-01T10:00:00Z",
    action: "DELETE_PATIENT",
    clinicId: "clinic-2",
    userId: "admin-2",
    status: "FAILED",
  },
  {
    id: "l3",
    createdAt: "2026-03-01T10:00:00Z",
    action: "EXPORT",
    status: "PENDING",
  },
];

describe("AuditsPage", () => {
  beforeEach(() => {
    mockApiGet.mockReset();
  });

  it("fetches the latest audit logs and renders rows with composed resources and status badges", async () => {
    mockApiGet.mockResolvedValueOnce(mockLogs);
    render(<AuditsPage />);

    await waitFor(() => {
      expect(screen.getByText("LOGIN")).toBeInTheDocument();
    });

    expect(mockApiGet).toHaveBeenCalledWith("/audit-logs?limit=100");

    // Resource + resourceId compose with a dot separator; missing ones fall back to a dash.
    expect(screen.getByText("user · u1")).toBeInTheDocument();
    expect(screen.getAllByText("—").length).toBeGreaterThanOrEqual(2);

    // Clinic / user cells render or fall back to a dash.
    expect(screen.getByText("clinic-1")).toBeInTheDocument();
    expect(screen.getByText("admin-1")).toBeInTheDocument();

    // Status badge contract: SUCCESS -> "Success", everything else -> "Failed".
    expect(screen.getByText("Success")).toBeInTheDocument();
    expect(screen.getAllByText("Failed")).toHaveLength(2);

    // Timestamps render through the en-IN timestamp formatter (TZ pinned to UTC).
    expect(
      screen.getByText(formatDateTime("2026-01-10T10:00:00Z", undefined, { locale: enIN })),
    ).toBeInTheDocument();

    // Footer counts the entries.
    expect(screen.getByText("Showing the 3 most recent entries")).toBeInTheDocument();
  });

  it("shows the empty state when no audit logs exist", async () => {
    mockApiGet.mockResolvedValueOnce([]);
    render(<AuditsPage />);

    await waitFor(() => {
      expect(screen.getByText("No audit logs found")).toBeInTheDocument();
    });
    expect(
      screen.getByText("Log entries will appear as admin actions are performed."),
    ).toBeInTheDocument();
  });

  it("re-fetches when Refresh is clicked", async () => {
    mockApiGet.mockResolvedValueOnce(mockLogs);
    render(<AuditsPage />);

    await waitFor(() => {
      expect(screen.getByText("LOGIN")).toBeInTheDocument();
    });

    mockApiGet.mockResolvedValueOnce([
      { id: "l9", createdAt: "2026-04-01T10:00:00Z", action: "NEW_ACTION", status: "SUCCESS" },
    ]);
    fireEvent.click(screen.getByRole("button", { name: /Refresh/ }));

    await waitFor(() => {
      expect(screen.getByText("NEW_ACTION")).toBeInTheDocument();
    });
    expect(mockApiGet).toHaveBeenCalledTimes(2);
    expect(screen.queryByText("LOGIN")).not.toBeInTheDocument();
  });
});
