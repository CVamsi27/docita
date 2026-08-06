import { screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi, beforeEach } from "vitest";
import type { ReactElement } from "react";
import { render } from "@/test-utils";
import { InvoiceDetailsUI } from "./InvoiceDetailsUI";

/**
 * Local messages mirror for the Invoices.totals namespace read by
 * InvoiceTotalsOnly. The test mocks react-i18next so
 * useTranslation("Invoices") resolves against these English strings.
 * New t() keys added to the details tree must be added here too.
 */
const invoiceMessages = vi.hoisted(() => ({
  Invoices: {
    totals: {
      amountInWordsLabel: "Amount in Words:",
      notesLabel: "Notes:",
      subtotalLabel: "Subtotal",
      discountLabel: "Discount",
      taxableValueLabel: "Taxable value",
      taxLabel: "Tax",
      documentLabel: "Document",
      totalLabel: "Total",
      amountPaidLabel: "Amount paid",
      balanceDueLabel: "Balance due",
    },
    itemsTable: {
      colDescription: "Description",
      colQty: "Qty",
      colUnitPrice: "Unit price",
      colTax: "Tax",
      colGstPercent: "GST %",
      colHsnSac: "HSN/SAC",
      colTotal: "Total",
    },
  },
}));

vi.mock("react-i18next", () => ({
  useTranslation: (ns?: string) => {
    const t = (
      key: string,
      params?: Record<string, string | number>,
    ): string => {
      const path = ns ? `${ns}.${key}` : key;
      const resolved = path.split(".").reduce<unknown>(
        (acc, part) =>
          acc && typeof acc === "object"
            ? (acc as Record<string, unknown>)[part]
            : undefined,
        invoiceMessages,
      );
      if (typeof resolved !== "string") return key;
      return resolved.replace(/\{name\}/g, String(params?.name ?? ""));
    };
    return { t, i18n: { language: "en" } };
  },
}));

vi.mock("@/components/auth/feature-gate", () => ({
  FeatureGate: ({ children }: { children: ReactElement }) => children,
  useFeature: () => false,
}));

vi.mock("@workspace/data-access", async (importOriginal) => {
  const mod = await importOriginal<typeof import("@workspace/data-access")>();
  return {
    ...mod,
    useInvoicePaymentActivity: () => ({
      data: { items: [] },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    }),
    useResendInvoiceWhatsApp: () => ({
      mutateAsync: vi.fn(),
      isPending: false,
    }),
  };
});

const useInvoiceDetailsLogicMock = vi.hoisted(() => vi.fn());
vi.mock("@/features/invoices/hooks/use-invoice-details-logic", () => ({
  useInvoiceDetailsLogic: (...args: unknown[]) =>
    useInvoiceDetailsLogicMock(...args),
}));

function renderWithQueryClient(ui: ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  );
}

const baseHookState = {
  invoice: {
    id: "inv-1",
    status: "PENDING",
    createdAt: "2026-03-31T10:00:00.000Z",
    updatedAt: "2026-03-31T10:00:00.000Z",
    total: 1000,
    totalAmount: 1000,
    items: [
      {
        id: "it-1",
        description: "Consultation",
        quantity: 1,
        unitPrice: 1000,
        total: 1000,
      },
    ],
    patient: {
      firstName: "Asha",
      lastName: "Rao",
      phoneNumber: "9999999999",
    },
  },
  isLoading: false,
  error: null,
  printRef: { current: null },
  handlePrint: vi.fn(),
  handleDownload: vi.fn(),
  isDownloading: false,
  calculateSubtotal: () => 1000,
  formatCurrency: () => "Rs 1,000",
  formatDate: () => "March 31, 2026",
  numberToWords: () => "One Thousand Rupees Only",
  clinic: {
    name: "Docita Clinic",
    slaSignatureUrl: null as string | null,
  },
};

describe("InvoiceDetailsUI signature block", () => {
  beforeEach(() => {
    useInvoiceDetailsLogicMock.mockReset();
  });

  it("renders authorized signature image when clinic signature exists", () => {
    useInvoiceDetailsLogicMock.mockReturnValue({
      ...baseHookState,
      clinic: {
        ...baseHookState.clinic,
        slaSignatureUrl: "https://example.com/signature.png",
      },
    });

    renderWithQueryClient(<InvoiceDetailsUI invoiceId="inv-1" />);

    expect(screen.getByText("Authorized Signature")).toBeInTheDocument();
    expect(
      screen.getByRole("img", { name: "Authorized Signature" }),
    ).toBeInTheDocument();
  });

  it("renders fallback text when clinic signature is missing", () => {
    useInvoiceDetailsLogicMock.mockReturnValue(baseHookState);

    renderWithQueryClient(<InvoiceDetailsUI invoiceId="inv-1" />);

    expect(screen.getByText("Authorized Signature")).toBeInTheDocument();
    expect(screen.getByText("Signature on file pending")).toBeInTheDocument();
  });
});
