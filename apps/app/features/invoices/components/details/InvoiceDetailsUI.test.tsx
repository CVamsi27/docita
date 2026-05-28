import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi, beforeEach } from "vitest";
import type { ImgHTMLAttributes, ReactElement } from "react";
import { InvoiceDetailsUI } from "./InvoiceDetailsUI";

vi.mock("@/components/auth/feature-gate", () => ({
  FeatureGate: ({ children }: { children: ReactElement }) => children,
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => ({
    get: () => null,
  }),
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

vi.mock("next/image", () => ({
  default: ({
    unoptimized: _unoptimized,
    ...props
  }: ImgHTMLAttributes<HTMLImageElement> & { unoptimized?: boolean }) => (
    <div
      role="img"
      aria-label={props.alt || ""}
      data-src={props.src as string | undefined}
    />
  ),
}));

vi.mock("@/hooks/use-back-navigation", () => ({
  useBackNavigation: () => vi.fn(),
}));

const useInvoiceDetailsLogicMock = vi.fn();
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
      { id: "it-1", description: "Consultation", quantity: 1, price: 1000 },
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
  handleShareWhatsApp: vi.fn(),
  calculateSubtotal: () => 1000,
  formatCurrency: () => "Rs 1,000",
  formatDate: () => "March 31, 2026",
  numberToWords: () => "One Thousand Rupees Only",
  router: { push: vi.fn() },
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
      invoice: {
        ...baseHookState.invoice,
        patient: {
          ...baseHookState.invoice.patient,
          clinic: {
            name: "Docita Clinic",
            slaSignatureUrl: "https://example.com/signature.png",
          },
        },
      },
      clinic: {
        ...baseHookState.clinic,
        slaSignatureUrl: null,
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
