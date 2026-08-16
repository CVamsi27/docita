import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { LeadsPage } from "./leads-page";
import { apiGet, apiPatch, apiPost } from "@/lib/api/api-client";
import { formatDateTime, enIN } from "@workspace/utils";

vi.mock("@/lib/api/api-client", () => ({
  apiGet: vi.fn(),
  apiPatch: vi.fn(),
  apiPost: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const mockApiGet = vi.mocked(apiGet);
const mockApiPatch = vi.mocked(apiPatch);
const mockApiPost = vi.mocked(apiPost);

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
    duplicateScore: null,
    duplicateOf: null,
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
      acknowledgedAt: null,
      acknowledgedByUserId: null,
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
    duplicateScore: null,
    duplicateOf: null,
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
      acknowledgedAt: null,
      acknowledgedByUserId: null,
      createdAt: "2026-08-14T10:05:00Z",
    },
  },
  {
    id: "l3",
    referrerId: "r3",
    referrerName: "Carol Partner",
    status: "DUPLICATE_REVIEW",
    facilityName: "Sunrise Diagnostics (2nd submit)",
    facilityType: "DIAGNOSTIC_CENTRE",
    address: "12 MG Road",
    city: "Pune",
    state: "Maharashtra",
    postalCode: "411001",
    contactName: "Dr Sana",
    contactPhone: "+919800000001",
    contactEmail: null,
    consentToFollowUp: true,
    createdAt: "2026-08-15T11:00:00Z",
    updatedAt: "2026-08-15T11:00:00Z",
    ownerUserId: null,
    ownerName: null,
    assignmentHistory: undefined,
    duplicateScore: 1,
    duplicateOf: { id: "l1", facilityName: "Sunrise Diagnostics" },
    notification: {
      id: "n3",
      leadId: "l3",
      kind: "LEAD_CREATED",
      status: "DELIVERED",
      recipientUserId: null,
      payload: {
        leadId: "l3",
        facilityName: "Sunrise Diagnostics (2nd submit)",
        city: "Bengaluru",
        state: "Karnataka",
        partnerName: "Carol Partner",
        consentToFollowUp: true,
        duplicateScore: 1,
        deepLink: "/leads",
      },
      errorMessage: null,
      deliveredAt: "2026-08-15T11:05:00Z",
      acknowledgedAt: null,
      acknowledgedByUserId: null,
      createdAt: "2026-08-15T11:05:00Z",
    },
  },
];

const OPERATORS = [
  { id: "op-1", name: "Kiran Ops", email: "kiran@docita.work" },
  { id: "op-2", name: "Amit Ops", email: "amit@docita.work" },
];

const REFERRERS = [
  { id: "r1", name: "Alice Partner" },
  { id: "r2", name: "Bob Partner" },
];

const envelope = (items: typeof mockLeads) => ({
  items,
  nextCursor: undefined,
  hasMore: false,
  count: items.length,
});

/** URL-routed default: pickers resolve, the leads list returns all fixtures. */
const mockDefaultApi = () => {
  mockApiGet.mockImplementation((url: string) => {
    if (url.startsWith("/api/internal/operators")) {
      return Promise.resolve(OPERATORS);
    }
    if (url.startsWith("/api/internal/referrers")) {
      return Promise.resolve(REFERRERS);
    }
    if (url.startsWith("/api/internal/leads")) {
      return Promise.resolve(envelope(mockLeads));
    }
    return Promise.resolve(undefined);
  });
};

const leadsCalls = () =>
  mockApiGet.mock.calls.filter(([url]) =>
    String(url).startsWith("/api/internal/leads"),
  );

describe("LeadsPage", () => {
  beforeEach(() => {
    mockApiGet.mockReset();
    mockApiPatch.mockReset();
    mockApiPost.mockReset();
    mockDefaultApi();
  });

  const renderPage = (initialEntries?: string[]) => {
    render(
      <MemoryRouter initialEntries={initialEntries ?? ["/leads"]}>
        <LeadsPage />
      </MemoryRouter>,
    );
  };

  const waitForRows = () =>
    waitFor(() =>
      expect(screen.getByText("Sunrise Diagnostics")).toBeInTheDocument(),
    );

  it("fetches the lead queue and renders rows with partner, contact, and status", async () => {
    renderPage();

    await waitForRows();

    expect(leadsCalls()[0][0]).toBe("/api/internal/leads");

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
    expect(screen.getByText("Duplicate review")).toBeInTheDocument();
    // Duplicate surface: linked original + exact-match score
    expect(
      screen.getByText("Duplicate of Sunrise Diagnostics (score 1)"),
    ).toBeInTheDocument();
    // Notification delivery status (l1 and the duplicate l3 are both notified)
    expect(screen.getAllByText("Notified").length).toBeGreaterThan(0);
    expect(screen.getByText("Notify failed")).toBeInTheDocument();
    // Owner column: assigned operator vs unassigned
    expect(screen.getByText("Kiran Ops")).toBeInTheDocument();
    expect(screen.getAllByText("Unassigned").length).toBeGreaterThan(0);
    // Dates
    expect(screen.getByText(formatDateTime("2026-08-15T10:00:00Z", undefined, { locale: enIN }))).toBeInTheDocument();
    // Pagination chrome
    expect(screen.getByText("Page 1")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Previous" })).toBeDisabled();
  });

  it("shows the empty state when no leads exist", async () => {
    mockApiGet.mockImplementation((url: string) => {
      if (url.startsWith("/api/internal/operators")) {
        return Promise.resolve(OPERATORS);
      }
      if (url.startsWith("/api/internal/referrers")) {
        return Promise.resolve(REFERRERS);
      }
      return Promise.resolve(envelope([]));
    });
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("No leads yet")).toBeInTheDocument();
    });
  });

  it("filters by status and owner, then clears filters back to page one", async () => {
    renderPage();
    await waitForRows();

    // Status filter -> the API is called with the status query. DataState
    // swaps the page for a loading state during each refetch, so wait for
    // the filter bar to return before the next interaction.
    fireEvent.click(screen.getByRole("combobox", { name: "Filter by status" }));
    fireEvent.click(await screen.findByRole("option", { name: "Submitted" }));
    await waitFor(() => {
      expect(leadsCalls().at(-1)?.[0]).toContain("status=SUBMITTED");
    });
    await waitFor(() => {
      expect(
        screen.getByRole("combobox", { name: "Filter by owner" }),
      ).toBeInTheDocument();
    });

    // Owner filter -> the API is called with the UNASSIGNED sentinel.
    fireEvent.click(screen.getByRole("combobox", { name: "Filter by owner" }));
    fireEvent.click(await screen.findByRole("option", { name: "Unassigned" }));
    await waitFor(() => {
      expect(leadsCalls().at(-1)?.[0]).toContain("owner=UNASSIGNED");
    });
    await waitFor(() => {
      expect(
        screen.getByRole("combobox", { name: "Filter by partner" }),
      ).toBeInTheDocument();
    });

    // Partner filter -> the API is called with the referrer id.
    fireEvent.click(
      screen.getByRole("combobox", { name: "Filter by partner" }),
    );
    fireEvent.click(await screen.findByRole("option", { name: "Bob Partner" }));
    await waitFor(() => {
      expect(leadsCalls().at(-1)?.[0]).toContain("referrerId=r2");
    });

    // The same fetch carries all three filters together.
    expect(leadsCalls().at(-1)?.[0]).toContain("status=SUBMITTED");
    expect(leadsCalls().at(-1)?.[0]).toContain("owner=UNASSIGNED");

    // Clear filters -> back to the unfiltered list.
    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    await waitFor(() => {
      expect(leadsCalls().at(-1)?.[0]).toBe("/api/internal/leads");
    });
    await waitFor(() => {
      expect(
        screen.queryByRole("button", { name: "Clear filters" }),
      ).not.toBeInTheDocument();
    });
  });

  it("shows the filtered empty state when nothing matches", async () => {
    mockApiGet.mockImplementation((url: string) => {
      if (url.startsWith("/api/internal/operators")) {
        return Promise.resolve(OPERATORS);
      }
      if (url.startsWith("/api/internal/referrers")) {
        return Promise.resolve(REFERRERS);
      }
      return Promise.resolve(envelope([]));
    });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("No leads yet")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("combobox", { name: "Filter by status" }));
    fireEvent.click(await screen.findByRole("option", { name: "Submitted" }));

    await waitFor(() => {
      expect(
        screen.getByText("No leads match these filters"),
      ).toBeInTheDocument();
    });
  });

  it("marks a notification as seen and refetches the queue", async () => {
    renderPage();
    await waitForRows();

    mockApiPost.mockResolvedValueOnce({
      id: "n1",
      acknowledgedAt: "2026-08-15T12:00:00Z",
      acknowledgedByUserId: "internal-9",
    });

    fireEvent.click(screen.getAllByRole("button", { name: "Mark seen" })[0]);

    await waitFor(() => {
      expect(mockApiPost).toHaveBeenCalledWith(
        "/api/internal/leads/l1/notification/ack",
      );
    });
    // Success refetches the queue.
    await waitFor(() => {
      expect(leadsCalls()).toHaveLength(2);
    });
  });

  it("shows Seen (with no Mark-seen action) for an acknowledged notification", async () => {
    const acknowledged = mockLeads.map((lead) =>
      lead.id === "l1"
        ? {
            ...lead,
            notification: {
              ...lead.notification,
              acknowledgedAt: "2026-08-15T12:00:00Z",
              acknowledgedByUserId: "internal-9",
            },
          }
        : lead,
    );
    mockApiGet.mockImplementation((url: string) => {
      if (url.startsWith("/api/internal/operators")) {
        return Promise.resolve(OPERATORS);
      }
      if (url.startsWith("/api/internal/referrers")) {
        return Promise.resolve(REFERRERS);
      }
      return Promise.resolve(envelope(acknowledged));
    });
    renderPage();
    await waitForRows();

    expect(screen.getByText("Seen")).toBeInTheDocument();
    // The duplicate row (l3) is still unacknowledged.
    expect(screen.getAllByRole("button", { name: "Mark seen" })).toHaveLength(
      1,
    );
  });

  it("narrows the queue to the deep-linked lead and offers Show all leads", async () => {
    renderPage(["/leads?lead=l2"]);
    await waitForRows();

    // The API key is `lead` — the same key the notification deep link
    // carries (`/leads?lead=<id>`), and the controller reads `@Query('lead')`.
    expect(leadsCalls().at(-1)?.[0]).toContain("lead=l2");
    expect(
      screen.getByText("Viewing a single lead from a notification"),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Show all leads" }));
    await waitFor(() => {
      expect(leadsCalls().at(-1)?.[0]).toBe("/api/internal/leads");
    });
    await waitFor(() => {
      expect(
        screen.queryByText("Viewing a single lead from a notification"),
      ).not.toBeInTheDocument();
    });
  });

  it("pages forward and backward with the cursor", async () => {
    mockApiGet.mockImplementation((url: string) => {
      if (url.startsWith("/api/internal/operators")) {
        return Promise.resolve(OPERATORS);
      }
      if (url.startsWith("/api/internal/referrers")) {
        return Promise.resolve(REFERRERS);
      }
      if (url.includes("cursor=c1")) {
        return Promise.resolve({
          items: [mockLeads[1]],
          nextCursor: undefined,
          hasMore: false,
          count: 1,
        });
      }
      return Promise.resolve({
        items: [mockLeads[0]],
        nextCursor: "c1",
        hasMore: true,
        count: 1,
      });
    });
    renderPage();
    await waitForRows();
    expect(screen.getByText("Page 1")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    await waitFor(() => {
      expect(leadsCalls().at(-1)?.[0]).toContain("cursor=c1");
    });
    await waitFor(() => {
      expect(screen.getByText("Page 2")).toBeInTheDocument();
    });
    // Page two has no further results -> Next disabled, Previous enabled.
    expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Previous" })).toBeEnabled();

    fireEvent.click(screen.getByRole("button", { name: "Previous" }));
    await waitFor(() => {
      expect(screen.getByText("Page 1")).toBeInTheDocument();
    });
    expect(leadsCalls().at(-1)?.[0]).toBe("/api/internal/leads");
    expect(screen.getByRole("button", { name: "Previous" })).toBeDisabled();
  });

  it("transitions a lead through the dialog and refreshes the list", async () => {
    renderPage();
    await waitForRows();

    mockApiPatch.mockResolvedValueOnce({ id: "l1", status: "TRIAGED" });

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

    // Success closes the dialog and refetches the queue.
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
    expect(leadsCalls()).toHaveLength(2);
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
    renderPage();
    await waitForRows();

    fireEvent.click(screen.getAllByRole("button", { name: "Assign" })[0]);
    const dialog = await screen.findByRole("dialog");

    expect(mockApiGet).toHaveBeenCalledWith("/api/internal/operators");

    fireEvent.click(within(dialog).getByRole("combobox"));
    fireEvent.click(await screen.findByRole("option", { name: /Amit Ops/ }));

    mockApiPatch.mockResolvedValueOnce({ id: "l1" });
    fireEvent.click(within(dialog).getByRole("button", { name: "Save Changes" }));

    await waitFor(() => {
      expect(mockApiPatch).toHaveBeenCalledWith("/api/internal/leads/l1/assign", {
        userId: "op-2",
      });
    });

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
    // Queue fetched on mount + once after the assignment.
    expect(leadsCalls()).toHaveLength(2);
    const { toast } = await import("sonner");
    expect(toast.success).toHaveBeenCalledWith("Lead owner updated");
  });
});
