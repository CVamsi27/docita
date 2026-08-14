import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { PricingPage } from "./pricing-page";
import { apiGet, apiPut } from "@/lib/api/api-client";

vi.mock("@/lib/api/api-client", () => ({
  apiGet: vi.fn(),
  apiPut: vi.fn(),
}));

const mockApiGet = vi.mocked(apiGet);
const mockApiPut = vi.mocked(apiPut);

const mockTier = {
  id: "t1",
  tier: "ESSENTIAL",
  monthlyBasePriceCents: 10000,
  includedPatients: 500,
  includedAppointments: 1000,
  includedStorageGB: 10,
  includedUsers: 5,
  overagePatientCents: 100,
  overageAppointmentCents: 50,
  overagePrescriptionCents: 30,
  overageInvoiceCents: 20,
  overageOcrPageCents: 40,
  overageApiCallCents: 10,
};

const mockOffer = {
  id: "o1",
  clinicId: "clinic-1",
  title: "Launch Discount",
  percentOff: 20,
  durationMonths: 6,
  validUntil: "2026-09-30T00:00:00Z",
};

const loadData = () => {
  mockApiGet.mockImplementation((url: string) =>
    url.includes("/offers")
      ? Promise.resolve([mockOffer])
      : Promise.resolve([mockTier]),
  );
};

const tierRow = () => {
  const row = screen.getByText("ESSENTIAL").closest("tr");
  expect(row).not.toBeNull();
  return within(row as HTMLElement);
};

describe("PricingPage", () => {
  beforeEach(() => {
    mockApiGet.mockReset();
    mockApiPut.mockReset();
    mockApiPut.mockResolvedValue({});
  });

  it("renders tier pricing inputs and offer rows from the API", async () => {
    loadData();
    render(<PricingPage />);

    await waitFor(() => {
      expect(screen.getByText("ESSENTIAL")).toBeInTheDocument();
    });

    // All eleven pricing fields render as numeric inputs prefilled with values.
    const inputs = tierRow().getAllByRole("spinbutton");
    expect(inputs).toHaveLength(11);
    expect(inputs[0]).toHaveValue(10000);
    expect(inputs[1]).toHaveValue(500);

    // Offers render in the offers tab with discount badge, duration, and date.
    // (radix TabsTrigger activates on mouseDown, not click.)
    fireEvent.mouseDown(screen.getByRole("tab", { name: /Facility Offers/ }));
    expect(screen.getByText("Launch Discount")).toBeInTheDocument();
    expect(screen.getByText("20% off")).toBeInTheDocument();
    expect(screen.getByText("6mo")).toBeInTheDocument();
    expect(screen.getByText(/Sept 2026/)).toBeInTheDocument();
  });

  it("edits a pricing field and saves the updated tier via apiPut", async () => {
    loadData();
    render(<PricingPage />);

    await waitFor(() => {
      expect(screen.getByText("ESSENTIAL")).toBeInTheDocument();
    });

    const row = tierRow();
    fireEvent.change(row.getAllByRole("spinbutton")[0], {
      target: { value: "12345" },
    });
    expect(row.getAllByRole("spinbutton")[0]).toHaveValue(12345);

    fireEvent.click(row.getByRole("button", { name: /Save/ }));

    await waitFor(() => {
      expect(mockApiPut).toHaveBeenCalledWith(
        "/api/internal/billing/pricing/tiers/t1",
        expect.objectContaining({ id: "t1", monthlyBasePriceCents: 12345 }),
      );
    });
  });

  it("falls back to zero for non-numeric pricing input", async () => {
    loadData();
    render(<PricingPage />);

    await waitFor(() => {
      expect(screen.getByText("ESSENTIAL")).toBeInTheDocument();
    });

    const input = tierRow().getAllByRole("spinbutton")[0];
    fireEvent.change(input, { target: { value: "abc" } });
    expect(input).toHaveValue(0);
  });

  it("shows empty states when no tiers or offers exist", async () => {
    mockApiGet.mockResolvedValue([]);
    render(<PricingPage />);

    await waitFor(() => {
      expect(screen.getByText("No tier pricing configured")).toBeInTheDocument();
    });

    fireEvent.mouseDown(screen.getByRole("tab", { name: /Facility Offers/ }));
    expect(screen.getByText("No offers created yet.")).toBeInTheDocument();
  });
});
