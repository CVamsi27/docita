import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { ReferralsPage } from "./referrals-page";
import { apiGet } from "@/lib/api/api-client";
import { formatDate } from "@/lib/formatters";

vi.mock("@/lib/api/api-client", () => ({
  apiGet: vi.fn(),
}));

const mockApiGet = vi.mocked(apiGet);

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

describe("ReferralsPage", () => {
  beforeEach(() => {
    mockApiGet.mockReset();
  });

  it("fetches referrers and payouts in parallel and renders derived stat cards", async () => {
    mockApiGet.mockResolvedValueOnce(mockReferrals);
    mockApiGet.mockResolvedValueOnce(mockPayouts);
    render(<ReferralsPage />);

    await waitFor(() => {
      expect(screen.getByText("Alice Referrer")).toBeInTheDocument();
    });

    expect(mockApiGet).toHaveBeenCalledWith("/api/internal/referrers");
    expect(mockApiGet).toHaveBeenCalledWith("/api/internal/referral-payouts/summary");

    // Derived stats: total = row count, converted = active filter, commission
    // = sum(totalCents) / 100 rendered in rupees.
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getAllByText("2").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("₹300")).toBeInTheDocument();
  });

  it("renders referral rows with contact/code fallbacks and status badges", async () => {
    mockApiGet.mockResolvedValueOnce(mockReferrals);
    mockApiGet.mockResolvedValueOnce(mockPayouts);
    render(<ReferralsPage />);

    await waitFor(() => {
      expect(screen.getByText("Alice Referrer")).toBeInTheDocument();
    });

    // Contact: email preferred, then phone, then dash.
    expect(screen.getByText("alice@example.com")).toBeInTheDocument();
    expect(screen.getByText("+919876543210")).toBeInTheDocument();
    expect(screen.getAllByText("-").length).toBeGreaterThanOrEqual(1);

    // Code badge or dash.
    expect(screen.getByText("ALICE10")).toBeInTheDocument();

    // Status badges: two active referrers, one inactive.
    expect(screen.getAllByText("Active")).toHaveLength(2);
    expect(screen.getByText("Inactive")).toBeInTheDocument();

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
});
