import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { LeadsPage } from "./leads-page";
import { apiGet, apiPatch } from "@/lib/api/api-client";
import { formatDate } from "@/lib/formatters";

vi.mock("@/lib/api/api-client", () => ({
  apiGet: vi.fn(),
  apiPatch: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const mockApiGet = vi.mocked(apiGet);
const mockApiPatch = vi.mocked(apiPatch);

const mockLeads = [
  {
    id: "l1",
    referrerId: "r1",
    referrerName: "Alice Partner",
    status: "SUBMITTED",
    facilityName: "Sunrise Diagnostics",
    facilityType: "DIAGNOSTIC_CENTRE",
    address: "12 MG Road",
    city: "Bengaluru",
    state: "Karnataka",
    postalCode: "560001",
    contactName: "Dr Anil",
    contactPhone: "+919812345678",
    contactEmail: null,
    consentToFollowUp: true,
    createdAt: "2026-08-15T10:00:00Z",
    updatedAt: "2026-08-15T10:00:00Z",
    ownerUserId: "op-1",
    ownerName: "Kiran Ops",
    assignmentHistory: [
      {
        fromUserId: null,
        toUserId: "op-1",
        actorId: "internal-9",
        at: "2026-08-15T09:00:00Z",
      },
    ],
    notification: {
      id: "n1",
      leadId: "l1",
      kind: "LEAD_CREATED",
      status: "DELIVERED",
      recipientUserId: "op-1",
      payload: {
        leadId: "l1",
        facilityName: "Sunrise Diagnostics",
        city: "Bengaluru",
        state: "Karnataka",
        partnerName: "Alice Partner",
        consentToFollowUp: true,
        duplicateScore: null,
        deepLink: "/leads",
      },
      errorMessage: null,
      deliveredAt: "2026-08-15T10:05:00Z",
      createdAt: "2026-08-15T10:05:00Z",
    },
  },
  {
    id: "l2",
    referrerId: "r2",
    referrerName: "Bob Partner",
    status: "LOST",
    facilityName: "Green Valley Hospital",
    facilityType: "HOSPITAL",
    address: "5 Lake Road",
    city: "Mysuru",
    state: null,
    postalCode: null,
    contactName: "Dr Meera",
    contactPhone: null,
    contactEmail: "meera@example.com",
    consentToFollowUp: true,
    createdAt: "2026-08-14T10:00:00Z",
    updatedAt: "2026-08-15T08:00:00Z",
    ownerUserId: null,
    ownerName: null,
    assignmentHistory: undefined,
    notification: {
      id: "n2",
      leadId: "l2",
      kind: "LEAD_CREATED",
      status: "FAILED",
      recipientUserId: null,
      payload: {
        leadId: "l2",
        facilityName: "Green Valley Hospital",
        city: "Mysuru",
        state: null,
        partnerName: "Bob Partner",
        consentToFollowUp: true,
        duplicateScore: null,
        deepLink: "/leads",
      },
      errorMessage: "connection refused",
      deliveredAt: null,
      createdAt: "2026-08-14T10:05:00Z",
    },
  },
];

describe("LeadsPage", () => {
  beforeEach(() => {
    mockApiGet.mockReset();
    mockApiPatch.mockReset();
  });

  const renderPage = () => {
    mockApiGet.mockResolvedValueOnce(mockLeads);
    render(<LeadsPage />);
  };

  const waitForRows = () =>
    waitFor(() =>
      expect(screen.getByText("Sunrise Diagnostics")).toBeInTheDocument(),
    );

  it("fetches the lead queue and renders rows with partner, contact, and status", async () => {
    renderPage();

    await waitForRows();

    expect(mockApiGet).toHaveBeenCalledWith("/api/internal/leads");

    // Facility + location
    expect(screen.getByText("Sunrise Diagnostics")).toBeInTheDocument();
    expect(screen.getByText("Bengaluru, Karnataka")).toBeInTheDocument();
    expect(screen.getByText("Green Valley Hospital")).toBeInTheDocument();
    // Partner + contact
    expect(screen.getByText("Alice Partner")).toBeInTheDocument();
    expect(screen.getByText("Dr Anil")).toBeInTheDocument();
    expect(screen.getByText("+919812345678")).toBeInTheDocument();
    // Status badges
    expect(screen.getByText("Submitted")).toBeInTheDocument();
    expect(screen.getByText("Lost")).toBeInTheDocument();
    // Notification delivery status
    expect(screen.getByText("Notified")).toBeInTheDocument();
    expect(screen.getByText("Notify failed")).toBeInTheDocument();
    // Owner column: assigned operator vs unassigned
    expect(screen.getByText("Kiran Ops")).toBeInTheDocument();
    expect(screen.getByText("Unassigned")).toBeInTheDocument();
    // Dates
    expect(screen.getByText(formatDate("2026-08-15T10:00:00Z"))).toBeInTheDocument();
  });

  it("shows the empty state when no leads exist", async () => {
    mockApiGet.mockResolvedValueOnce([]);
    render(<LeadsPage />);

    await waitFor(() => {
      expect(screen.getByText("No leads yet")).toBeInTheDocument();
    });
  });

  it("transitions a lead through the dialog and refreshes the list", async () => {
    renderPage();
    await waitForRows();

    mockApiPatch.mockResolvedValueOnce({ id: "l1", status: "TRIAGED" });
    mockApiGet.mockResolvedValueOnce(mockLeads);

    fireEvent.click(screen.getAllByRole("button", { name: "Update status" })[0]);
    const dialog = await screen.findByRole("dialog");

    // Description text is split across text nodes; match it as a whole.
    expect(
      within(dialog).getByText(/Sunrise Diagnostics \(Submitted\)/),
    ).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole("combobox"));
    fireEvent.click(await screen.findByRole("option", { name: "Triaged" }));
    fireEvent.change(within(dialog).getByPlaceholderText("Why is this lead moving to this state?"), {
      target: { value: "Qualified via phone, needs a demo" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Save Changes" }));

    await waitFor(() => {
      expect(mockApiPatch).toHaveBeenCalledWith("/api/internal/leads/l1/status", {
        status: "TRIAGED",
        reason: "Qualified via phone, needs a demo",
      });
    });

    // Success closes the dialog and refetches.
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
    expect(mockApiGet).toHaveBeenCalledTimes(2);
    const { toast } = await import("sonner");
    expect(toast.success).toHaveBeenCalledWith("Lead status updated");
  });

  it("blocks submission without a reason", async () => {
    renderPage();
    await waitForRows();

    fireEvent.click(screen.getAllByRole("button", { name: "Update status" })[0]);
    const dialog = await screen.findByRole("dialog");

    fireEvent.click(within(dialog).getByRole("combobox"));
    fireEvent.click(await screen.findByRole("option", { name: "Triaged" }));
    fireEvent.click(within(dialog).getByRole("button", { name: "Save Changes" }));

    expect(
      within(dialog).getByText("Add a short reason for this change"),
    ).toBeInTheDocument();
    expect(mockApiPatch).not.toHaveBeenCalled();
  });

  it("disables the transition action for terminal leads", async () => {
    renderPage();
    await waitForRows();

    // Bob's lead (l2) is LOST — absorbing, no reachable targets.
    const table = screen.getByRole("table");
    const lostRow = within(table)
      .getByText("Green Valley Hospital")
      .closest("tr") as HTMLElement;
    expect(
      within(lostRow).getByRole("button", { name: "Update status" }),
    ).toBeDisabled();
  });

  it("assigns an owner through the dialog and refreshes the queue", async () => {
    mockApiGet.mockResolvedValueOnce(mockLeads);
    render(<LeadsPage />);
    await waitForRows();

    // The assign dialog fetches the operator picker list on open.
    mockApiGet.mockResolvedValueOnce([
      { id: "op-2", name: "Amit Ops", email: "amit@docita.work" },
      { id: "op-3", name: "Neha Ops", email: "neha@docita.work" },
    ]);

    fireEvent.click(screen.getAllByRole("button", { name: "Assign" })[0]);
    const dialog = await screen.findByRole("dialog");

    expect(mockApiGet).toHaveBeenCalledWith("/api/internal/operators");

    fireEvent.click(within(dialog).getByRole("combobox"));
    fireEvent.click(await screen.findByRole("option", { name: /Amit Ops/ }));

    mockApiPatch.mockResolvedValueOnce({ id: "l1" });
    mockApiGet.mockResolvedValueOnce(mockLeads);
    fireEvent.click(within(dialog).getByRole("button", { name: "Save Changes" }));

    await waitFor(() => {
      expect(mockApiPatch).toHaveBeenCalledWith("/api/internal/leads/l1/assign", {
        userId: "op-2",
      });
    });

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
    expect(mockApiGet).toHaveBeenCalledTimes(3); // leads + operators + refetch
    const { toast } = await import("sonner");
    expect(toast.success).toHaveBeenCalledWith("Lead owner updated");
  });
});
