import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { EnterpriseContractsPage } from "./enterprise-contracts-page";
import { apiGet } from "@/lib/api/api-client";

vi.mock("@/lib/api/api-client", () => ({
  apiGet: vi.fn(),
}));

const mockApiGet = vi.mocked(apiGet);

const mockContracts = [
  {
    id: "c1",
    clinicName: "Acme Health",
    tier: "ENTERPRISE",
    startDate: "2026-01-15T10:00:00Z",
    endDate: "2026-12-31T23:59:00Z",
    status: "ACTIVE",
    monthlyAmount: 250000,
    currency: "INR",
    notes: "Custom SLA with 99.9% uptime",
  },
  {
    id: "c2",
    clinicName: "City Hospital",
    tier: "CUSTOM",
    startDate: "2026-02-01T09:00:00Z",
    status: "ACTIVE",
    monthlyAmount: 120000,
    currency: "INR",
  },
  {
    id: "c3",
    clinicName: "Old Clinic",
    tier: "ENTERPRISE",
    startDate: "2025-06-01T00:00:00Z",
    endDate: "2026-05-31T23:59:00Z",
    status: "EXPIRED",
    monthlyAmount: 150000,
    currency: "USD",
  },
];

const rowFor = (clinicName: string) => {
  const row = screen.getByText(clinicName).closest("tr");
  expect(row).not.toBeNull();
  return within(row as HTMLElement);
};

describe("EnterpriseContractsPage", () => {
  beforeEach(() => {
    mockApiGet.mockReset();
  });

  it("fetches contracts and renders stat cards with derived counts and MRR", async () => {
    mockApiGet.mockResolvedValueOnce(mockContracts);
    render(<EnterpriseContractsPage />);

    await waitFor(() => {
      expect(screen.getByText("Acme Health")).toBeInTheDocument();
    });

    expect(mockApiGet).toHaveBeenCalledWith("/api/internal/enterprise-contracts");

    // Stat cards: totals and the derived active count / MRR sum.
    expect(screen.getByText("Total Contracts")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("Active Contracts")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("Total MRR")).toBeInTheDocument();
    expect(screen.getByText("₹5,20,000")).toBeInTheDocument();
  });

  it("renders each contract row with tier/status badges, currency, and start date", async () => {
    mockApiGet.mockResolvedValueOnce(mockContracts);
    render(<EnterpriseContractsPage />);

    await waitFor(() => {
      expect(screen.getByText("Acme Health")).toBeInTheDocument();
    });

    // Row-level monthly amounts use the contract currency with 0 fraction digits.
    expect(rowFor("Acme Health").getByText("₹2,50,000")).toBeInTheDocument();
    expect(rowFor("City Hospital").getByText("₹1,20,000")).toBeInTheDocument();
    expect(rowFor("Old Clinic").getByText("$1,50,000")).toBeInTheDocument();

    // Tier badges and status badges render per contract.
    expect(rowFor("Acme Health").getByText("ENTERPRISE")).toBeInTheDocument();
    expect(rowFor("Acme Health").getByText("ACTIVE")).toBeInTheDocument();
    expect(rowFor("Old Clinic").getByText("EXPIRED")).toBeInTheDocument();

    // Start dates render in the en-IN locale (Asia/Calcutta timezone).
    expect(rowFor("Acme Health").getByText("15 Jan 2026, 03:30 pm")).toBeInTheDocument();
    expect(rowFor("City Hospital").getByText("1 Feb 2026, 02:30 pm")).toBeInTheDocument();
  });

  it("shows the empty state when no contracts exist", async () => {
    mockApiGet.mockResolvedValueOnce([]);
    render(<EnterpriseContractsPage />);

    await waitFor(() => {
      expect(screen.getByText("No enterprise contracts yet")).toBeInTheDocument();
    });

    // Total and Active contract cards both show zero; MRR shows ₹0.
    expect(screen.getAllByText("0").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText("₹0")).toBeInTheDocument();
  });

  it("opens the view dialog with full contract details including end date and notes", async () => {
    mockApiGet.mockResolvedValueOnce(mockContracts);
    render(<EnterpriseContractsPage />);

    await waitFor(() => {
      expect(screen.getByText("Acme Health")).toBeInTheDocument();
    });

    fireEvent.click(rowFor("Acme Health").getAllByRole("button")[0]);

    // Radix Dialog mounts portal content async.
    const dialog = within(await screen.findByRole("dialog"));
    expect(dialog.getByText("Contract Details")).toBeInTheDocument();
    expect(dialog.getByText("Acme Health")).toBeInTheDocument();
    expect(dialog.getByText("ENTERPRISE")).toBeInTheDocument();
    expect(dialog.getByText("₹2,50,000")).toBeInTheDocument();
    expect(dialog.getByText("1 Jan 2027, 05:29 am")).toBeInTheDocument();
    expect(dialog.getByText("Custom SLA with 99.9% uptime")).toBeInTheDocument();
  });

  it("omits end date and notes from the dialog when absent", async () => {
    mockApiGet.mockResolvedValueOnce(mockContracts);
    render(<EnterpriseContractsPage />);

    await waitFor(() => {
      expect(screen.getByText("City Hospital")).toBeInTheDocument();
    });

    fireEvent.click(rowFor("City Hospital").getAllByRole("button")[0]);

    const dialog = within(await screen.findByRole("dialog"));
    expect(dialog.getByText("1 Feb 2026, 02:30 pm")).toBeInTheDocument();
    expect(dialog.queryByText("End Date")).not.toBeInTheDocument();
    expect(dialog.queryByText("Notes")).not.toBeInTheDocument();
  });
});
