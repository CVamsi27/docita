import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { ReferralsPage } from "./referrals-page";
import { apiGet, apiPost } from "@/lib/api/api-client";
import { formatDate } from "@/lib/formatters";

vi.mock("@/lib/api/api-client", () => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const mockApiGet = vi.mocked(apiGet);
const mockApiPost = vi.mocked(apiPost);

const mockReferrals = [
  {
    id: "r1",
    name: "Alice Referrer",
    email: "alice@example.com",
    code: "ALICE10",
    active: true,
    createdAt: "2026-01-10T10:00:00Z",
  },
  {
    id: "r2",
    name: "Bob Referrer",
    phone: "+919876543210",
    active: false,
    createdAt: "2026-02-01T10:00:00Z",
  },
  {
    id: "r3",
    name: "Carol Referrer",
    active: true,
    createdAt: "2026-03-01T10:00:00Z",
  },
];

const mockPayouts = [
  { status: "PAID", count: 2, totalCents: 25000 },
  { status: "PENDING", count: 1, totalCents: 5000 },
];

const mockMessages = [
  {
    id: "m1",
    kind: "WELCOME",
    channel: "whatsapp",
    template: "referrer_welcome",
    status: "SENT",
    externalId: "waba-1",
    errorMessage: null,
    createdAt: "2026-01-11T10:00:00Z",
    sentAt: "2026-01-11T10:01:00Z",
  },
  {
    id: "m2",
    kind: "RESEND_WELCOME",
    channel: "whatsapp",
    template: "referrer_welcome",
    status: "FAILED",
    externalId: null,
    errorMessage: "Template not approved",
    createdAt: "2026-01-12T10:00:00Z",
    sentAt: null,
  },
];

describe("ReferralsPage", () => {
  beforeEach(() => {
    mockApiGet.mockReset();
    mockApiPost.mockReset();
  });

  const renderPage = () => {
    mockApiGet.mockResolvedValueOnce(mockReferrals);
    mockApiGet.mockResolvedValueOnce(mockPayouts);
    render(<ReferralsPage />);
  };

  const waitForRows = () =>
    waitFor(() => expect(screen.getByText("Alice Referrer")).toBeInTheDocument());

  it("fetches referrers and payouts in parallel and renders derived stat cards", async () => {
    renderPage();

    await waitForRows();

    expect(mockApiGet).toHaveBeenCalledWith("/api/internal/referrers");
    expect(mockApiGet).toHaveBeenCalledWith("/api/internal/referral-payouts/summary");

    // Derived stats: total = row count, converted = active filter, commission
    // = sum(totalCents) / 100 rendered in rupees.
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getAllByText("2").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("₹300")).toBeInTheDocument();
  });

  it("renders referral rows with contact/code fallbacks and status badges", async () => {
    renderPage();

    await waitForRows();

    // Contact: email preferred, then phone, then dash.
    expect(screen.getByText("alice@example.com")).toBeInTheDocument();
    expect(screen.getByText("+919876543210")).toBeInTheDocument();
    expect(screen.getAllByText("-").length).toBeGreaterThanOrEqual(1);

    // Code badge or dash.
    expect(screen.getByText("ALICE10")).toBeInTheDocument();

    // Status badges: two active referrers, one inactive. Scoped to the table
    // because the "Active" stat-card label matches the same text.
    const table = screen.getByRole("table");
    expect(within(table).getAllByText("Active")).toHaveLength(2);
    expect(within(table).getByText("Inactive")).toBeInTheDocument();

    // Dates render through the en-IN date formatter (TZ pinned to UTC).
    expect(screen.getByText(formatDate("2026-01-10T10:00:00Z"))).toBeInTheDocument();
  });

  it("shows the empty state when no referrals exist", async () => {
    mockApiGet.mockResolvedValueOnce([]);
    mockApiGet.mockResolvedValueOnce([]);
    render(<ReferralsPage />);

    await waitFor(() => {
      expect(screen.getByText("No referrals yet")).toBeInTheDocument();
    });
  });

  it("creates a partner through the dialog and refreshes the list", async () => {
    renderPage();
    await waitForRows();

    mockApiPost.mockResolvedValueOnce({
      id: "r4",
      name: "Diana Partner",
      code: "RFR-ABCDEF",
    });
    // The post-create refetch resolves the list + payout summary again.
    mockApiGet.mockResolvedValueOnce(mockReferrals);
    mockApiGet.mockResolvedValueOnce(mockPayouts);

    fireEvent.click(screen.getByRole("button", { name: "Create Partner" }));
    const dialog = await screen.findByRole("dialog");

    fireEvent.change(within(dialog).getByPlaceholderText("Partner name"), {
      target: { value: "Diana Partner" },
    });
    fireEvent.change(within(dialog).getByPlaceholderText("+91 98XXXXXXXX"), {
      target: { value: "9812345678" },
    });
    fireEvent.click(
      within(dialog).getByRole("button", { name: "Create Partner" }),
    );

    await waitFor(() => {
      expect(mockApiPost).toHaveBeenCalledWith("/api/internal/referrers", {
        name: "Diana Partner",
        type: "PHARMACY",
        phone: "9812345678",
        email: undefined,
      });
    });

    // Success closes the dialog, refetches the list, and toasts.
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
    expect(mockApiGet).toHaveBeenCalledTimes(4);
    const { toast } = await import("sonner");
    expect(toast.success).toHaveBeenCalledWith("Partner created successfully");
  });

  it("surfaces the DUPLICATE_ENTRY conflict inline instead of creating a duplicate", async () => {
    renderPage();
    await waitForRows();

    // Real wire shape: the API's AllExceptionsFilter emits a problem-details
    // envelope (detail + code) — the data-access client copies `code` onto the
    // error and exposes the body as `data`.
    mockApiPost.mockRejectedValueOnce(
      Object.assign(new Error("conflict"), {
        status: 409,
        code: "DUPLICATE_ENTRY",
        data: {
          detail: "A partner with this phone number already exists",
        },
      }),
    );

    fireEvent.click(screen.getByRole("button", { name: "Create Partner" }));
    const dialog = await screen.findByRole("dialog");

    fireEvent.change(within(dialog).getByPlaceholderText("Partner name"), {
      target: { value: "Duplicate Partner" },
    });
    fireEvent.change(within(dialog).getByPlaceholderText("+91 98XXXXXXXX"), {
      target: { value: "9812345678" },
    });
    fireEvent.click(
      within(dialog).getByRole("button", { name: "Create Partner" }),
    );

    await waitFor(() => {
      expect(
        within(dialog).getByText(
          "A partner with this phone number already exists. Use the existing record instead.",
        ),
      ).toBeInTheDocument();
    });
    // Dialog stays open and the list is not refetched.
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(mockApiGet).toHaveBeenCalledTimes(2);
  });

  it("blocks submission with an empty name", async () => {
    renderPage();
    await waitForRows();

    fireEvent.click(screen.getByRole("button", { name: "Create Partner" }));
    const dialog = await screen.findByRole("dialog");

    fireEvent.click(
      within(dialog).getByRole("button", { name: "Create Partner" }),
    );

    expect(
      within(dialog).getByText("Partner name is required"),
    ).toBeInTheDocument();
    expect(mockApiPost).not.toHaveBeenCalled();
  });

  it("clears stale validation errors when the dialog is reopened", async () => {
    renderPage();
    await waitForRows();

    // Submit an empty form once so a name error is set.
    fireEvent.click(screen.getByRole("button", { name: "Create Partner" }));
    const dialog = await screen.findByRole("dialog");
    fireEvent.click(
      within(dialog).getByRole("button", { name: "Create Partner" }),
    );
    expect(
      within(dialog).getByText("Partner name is required"),
    ).toBeInTheDocument();

    // Cancel, reopen: the previous error must not leak into the fresh dialog.
    fireEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole("button", { name: "Create Partner" }));
    const reopened = await screen.findByRole("dialog");
    expect(
      within(reopened).queryByText("Partner name is required"),
    ).not.toBeInTheDocument();
  });

  it("resends the welcome message from a row action", async () => {
    renderPage();
    await waitForRows();

    mockApiPost.mockResolvedValueOnce({ ok: true });

    fireEvent.click(
      screen.getAllByRole("button", { name: "Resend welcome" })[0],
    );

    await waitFor(() => {
      expect(mockApiPost).toHaveBeenCalledWith(
        "/api/internal/referrers/r1/resend-welcome",
      );
    });
    const { toast } = await import("sonner");
    expect(toast.success).toHaveBeenCalledWith(
      "Welcome message queued for Alice Referrer",
    );
  });

  it("opens the messages drawer and renders the delivery audit trail", async () => {
    renderPage();
    await waitForRows();

    mockApiGet.mockResolvedValueOnce(mockMessages);

    fireEvent.click(screen.getAllByRole("button", { name: "Messages" })[0]);
    const dialog = await screen.findByRole("dialog");

    await waitFor(() => {
      expect(mockApiGet).toHaveBeenCalledWith(
        "/api/internal/referrers/r1/messages",
      );
      expect(within(dialog).getByText("Welcome")).toBeInTheDocument();
      expect(within(dialog).getByText("Welcome (resend)")).toBeInTheDocument();
    });

    // FAILED entries surface their delivery error for the operator.
    expect(within(dialog).getByText("Template not approved")).toBeInTheDocument();
  });
});
