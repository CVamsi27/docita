import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@/test-utils";
import type { CollectionsByModeResponse } from "@workspace/types";
import { formatCurrency } from "@workspace/utils";
import { DeskCollectionsByModeReport } from "./DeskCollectionsByModeReport";

const { useCollectionsByModeReport, useClinicSettings } = vi.hoisted(() => ({
  useCollectionsByModeReport: vi.fn(),
  useClinicSettings: vi.fn(),
}));

vi.mock("@workspace/data-access", () => ({
  useCollectionsByModeReport,
  useClinicSettings,
}));

describe("DeskCollectionsByModeReport", () => {
  const refetch = vi.fn();
  const report: CollectionsByModeResponse = {
    from: "2026-06-01",
    to: "2026-06-01",
    currency: "USD",
    count: 2,
    totalCents: 3750,
    byMode: [
      { mode: "CASH", label: "Cash", count: 1, amountCents: 1250 },
      { mode: "CARD_POS", label: "Card (POS)", count: 1, amountCents: 2500 },
    ],
  };
  const formatClinicMoney = (amount: number | undefined) =>
    formatCurrency(amount ?? 0, { currency: "INR" });

  beforeEach(() => {
    vi.clearAllMocks();
    useClinicSettings.mockReturnValue({
      data: { timezone: "Asia/Kolkata", currency: "INR" },
    });
    useCollectionsByModeReport.mockReturnValue({
      data: report,
      isLoading: false,
      isError: false,
      error: null,
      refetch,
    });
  });

  it("shows historical payment amounts in the returned report currency", () => {
    render(<DeskCollectionsByModeReport formatMoney={formatClinicMoney} />);

    expect(screen.getByRole("cell", { name: "$12.50", exact: true })).toBeVisible();
    expect(screen.getByRole("cell", { name: "$25.00", exact: true })).toBeVisible();
    expect(screen.getByRole("cell", { name: "$37.50", exact: true })).toBeVisible();
    expect(screen.queryByText(/₹/)).not.toBeInTheDocument();
  });

  it("keeps the amount and clinic currency for same-currency reports", () => {
    useCollectionsByModeReport.mockReturnValue({
      data: { ...report, currency: "INR" },
      isLoading: false,
      isError: false,
      error: null,
      refetch,
    });

    render(<DeskCollectionsByModeReport formatMoney={formatClinicMoney} />);

    expect(screen.getByRole("cell", { name: "₹12.50", exact: true })).toBeVisible();
    expect(screen.getByRole("cell", { name: "₹37.50", exact: true })).toBeVisible();
  });

  it("shows the mixed-currency API error and hides a cached financial total", () => {
    useCollectionsByModeReport.mockReturnValue({
      data: report,
      isLoading: false,
      isError: true,
      error: new Error("Cannot total collections in multiple currencies"),
      refetch,
    });

    render(<DeskCollectionsByModeReport formatMoney={formatClinicMoney} />);

    expect(screen.getByText("Cannot total collections in multiple currencies")).toBeVisible();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(refetch).toHaveBeenCalledTimes(1);
  });
});
