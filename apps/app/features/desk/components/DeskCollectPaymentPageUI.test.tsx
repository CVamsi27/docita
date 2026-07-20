import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { InvoiceListRow } from "@workspace/types";
import { TooltipProvider } from "@workspace/ui/components/overlay/tooltip";
import { NextIntlClientProvider } from "next-intl";
import { DeskCollectPaymentPageUI } from "./DeskCollectPaymentPageUI";

const deskMocks = vi.hoisted(() => ({
  openInvoiceItems: [] as InvoiceListRow[],
  useDeskOpenInvoices: vi.fn(),
  recordSettlement: {
    isPending: false,
    mutateAsync: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock("@workspace/data-access", () => ({
  usePatients: () => ({
    data: {
      items: [
        {
          id: "patient-1",
          firstName: "Asha",
          lastName: "Rao",
          phoneNumber: "+919999999999",
        },
      ],
    },
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }),
  useCollectionsByModeReport: () => ({
    data: { byMode: [], totalCents: 0, count: 0 },
    isLoading: false,
    isError: false,
    error: undefined,
    refetch: vi.fn(),
  }),
}));

vi.mock("@/features/desk/hooks/use-desk-open-invoices", () => ({
  useDeskOpenInvoices: (patientId: string | null) =>
    deskMocks.useDeskOpenInvoices(patientId),
}));

vi.mock("@/features/desk/hooks/use-desk-record-invoice-settlement", () => ({
  useDeskRecordInvoiceSettlement: () => deskMocks.recordSettlement,
}));

vi.mock("@/hooks/use-clinic-currency", () => ({
  useClinicCurrency: () => ({
    formatCurrency: (amount: number) => `INR ${amount.toFixed(2)}`,
  }),
}));

vi.mock("@/lib/auth/auth-context", () => ({
  useAuth: () => ({ user: { role: "RECEPTIONIST" } }),
}));

const messages = {
  Desk: {
    collectionsByModeReport: {
      reportMicroLabel: "Report",
      title: "Collections by mode",
      fromLabel: "From",
      toLabel: "To",
      loadingLabel: "Loading collections…",
      invalidRangeErrorFallback: "Select a valid date range to view collections.",
      emptyRangeTitle: "No collections in this range",
      emptyRangeDescription: "Settled desk and online payments will appear here grouped by payment mode.",
      invalidRangeTitle: "Invalid date range",
      invalidRangeDescription: "The start date must be on or before the end date.",
      colPaidBy: "Paid by",
      colPayments: "Payments",
      colAmount: "Amount",
      totalLabel: "Total",
    },
  },
};

function renderWithIntl(node: React.ReactNode) {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      {node}
    </NextIntlClientProvider>,
  );
}

function buildInvoice(overrides: Partial<InvoiceListRow>): InvoiceListRow {
  return {
    id: "invoice-1",
    patientId: "patient-1",
    invoiceNumber: "INV-OPEN",
    items: [],
    notes: "",
    total: 500,
    status: "PENDING",
    createdAt: "2026-06-05T10:00:00.000Z",
    ...overrides,
  };
}

describe("DeskCollectPaymentPageUI", () => {
  beforeEach(() => {
    deskMocks.openInvoiceItems = [];
    deskMocks.useDeskOpenInvoices.mockImplementation(
      (patientId: string | null) => ({
        data: patientId
          ? {
              items: deskMocks.openInvoiceItems,
              hasMore: false,
              count: deskMocks.openInvoiceItems.length,
            }
          : undefined,
        isLoading: false,
        isError: false,
        refetch: vi.fn(),
      }),
    );
    deskMocks.recordSettlement.mutateAsync.mockReset();
  });

  it("renders collectible invoices from the desk endpoint and hides paid rows", async () => {
    deskMocks.openInvoiceItems = [
      buildInvoice({ id: "open-1", invoiceNumber: "INV-OPEN" }),
      buildInvoice({
        id: "paid-1",
        invoiceNumber: "INV-PAID",
        status: "PAID",
      }),
    ];

    renderWithIntl(
      <TooltipProvider>
        <DeskCollectPaymentPageUI />
      </TooltipProvider>,
    );

    const searchInput = screen.getByLabelText("Search patients");
    fireEvent.change(searchInput, { target: { value: "Asha" } });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Asha Rao/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /Asha Rao/i }));

    await waitFor(() => {
      const invTexts = screen.getAllByText("#INV-OPEN");
      expect(invTexts.length).toBeGreaterThan(0);
    });
    expect(screen.queryByText("#INV-PAID")).not.toBeInTheDocument();
  });

  it("shows an empty state when the desk endpoint has no collectible invoices", async () => {
    deskMocks.openInvoiceItems = [
      buildInvoice({
        id: "paid-1",
        invoiceNumber: "INV-PAID",
        status: "PAID",
      }),
    ];

    renderWithIntl(
      <TooltipProvider>
        <DeskCollectPaymentPageUI />
      </TooltipProvider>,
    );

    const searchInput = screen.getByLabelText("Search patients");
    fireEvent.change(searchInput, { target: { value: "Asha" } });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Asha Rao/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /Asha Rao/i }));

    await waitFor(() => {
      expect(screen.getByText("No open invoices")).toBeInTheDocument();
    });
    expect(screen.queryByText("#INV-PAID")).not.toBeInTheDocument();
  });
});
