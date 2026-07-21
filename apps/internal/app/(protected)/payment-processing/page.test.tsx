import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { ReactElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DataAccessProvider, type RequestConfig } from "@workspace/data-access";
import PaymentProcessingPage from "./page";

const clientMocks = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
}));
const toastSuccessMock = vi.hoisted(() => vi.fn());
const showUserFacingErrorToastMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth/auth", () => ({
  useAuth: () => ({
    token: "test-token",
    isInternal: true,
    isLoading: false,
  }),
}));

vi.mock("@/lib/api/api-client", () => ({
  client: clientMocks,
}));

vi.mock("@/lib/errors/user-facing-errors", () => ({
  showUserFacingErrorToast: showUserFacingErrorToastMock,
}));

vi.mock("sonner", () => ({
  toast: {
    success: toastSuccessMock,
  },
}));

const clinic = {
  id: "clinic_1",
  name: "Care Clinic",
  tier: "ESSENTIAL",
  email: "billing@care.example",
  phone: "+919000000000",
  currency: "INR",
};

const tierPricing = [
  {
    tier: "ESSENTIAL",
    price: 999,
    billingCycle: "monthly",
    maxDoctors: 20,
    maxPatients: 500,
    features: ["Standard"],
  },
  {
    tier: "PROFESSIONAL",
    displayName: "Professional",
    price: 2499,
    billingCycle: "monthly",
    maxDoctors: 50,
    maxPatients: 2000,
    features: ["Advanced"],
  },
  {
    tier: "ENTERPRISE",
    displayName: "Enterprise",
    price: 0,
    priceIsCustom: true,
    billingCycle: "custom",
    maxDoctors: -1,
    maxPatients: -1,
    features: ["Enterprise"],
  },
];

const pricingConfig = {
  tiers: [
    { id: "ESSENTIAL", pricing: { monthly: 999 } },
    { id: "PROFESSIONAL", pricing: { monthly: 2499 } },
  ],
};

function renderWithQueryClient(ui: ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  const fetcher = <T,>(
    endpoint: string,
    _options?: RequestConfig,
  ): Promise<T> => clientMocks.get(endpoint) as Promise<T>;

  return render(
    <QueryClientProvider client={queryClient}>
      <DataAccessProvider
        config={{
          fetcher,
          getClinicId: () => undefined,
          getClinicTimezone: () => undefined,
          isTierFeatureEnabled: () => true,
        }}
      >
        <NextIntlClientProvider locale="en" messages={messages}>
          {ui}
        </NextIntlClientProvider>
      </DataAccessProvider>
    </QueryClientProvider>,
  );
}

/**
 * Local messages mirror covering all namespaces read by
 * PaymentProcessingPage + PaymentFormFields + the payment
 * dialog. The test renders via NextIntlClientProvider so
 * useTranslations resolves against these English strings.
 */
const messages = {
  InternalPaymentProcessing: {
    formFields: {
      tierLabel: "Upgrade to Tier",
      tierDescription: "Select the new tier for this facility",
      amountLabel: "Amount ({currency})",
      amountPlaceholder: "Amount",
      amountDescription: "Amount will be auto-calculated based on selected tier",
      paymentMethodLabel: "Payment Method",
      paymentMethodRazorpay: "Razorpay",
      paymentMethodStripe: "Stripe",
      paymentMethodBankTransfer: "Bank Transfer",
      paymentMethodManual: "Manual",
      paymentNotesLabel: "Payment Notes (Optional)",
      paymentNotesPlaceholder: "Payment notes",
    },
    additionalCharge: {
      categoryLabel: "Charge category",
      categoryGuidedSetup: "Guided setup",
      categoryDataMigration: "Data migration",
      categoryCustomTraining: "Custom training",
      categoryIntegration: "Integration",
      categoryCommercialDiscount: "Commercial discount / adjustment",
      categoryOther: "Other service",
      categoryDescription: "Guided setup is separate from the software subscription. Default amount follows the list price for the clinic's currency; adjust to match your invoice.",
      amountLabel: "Amount ({currency})",
      amountPlaceholder: "Enter amount",
    },
    chargeSummary: {
      paymentMethodLabel: "Payment method",
      paymentMethodRazorpay: "Razorpay",
      paymentMethodStripe: "Stripe",
      paymentMethodBank: "Bank transfer",
      paymentMethodManual: "Manual",
      razorpayIdLabel: "Razorpay payment ID (optional)",
      razorpayIdPlaceholder: "Enter Razorpay payment id",
      notesLabel: "Notes (optional)",
      notesPlaceholder: "Scope, invoice reference, or internal note",
    },
    pricingOffers: {
      noActiveDiscounts: "No active checkout discounts.",
      colFacilityName: "Facility Name",
      colCurrentTier: "Current Tier",
      colMaxDoctors: "Max Doctors",
      colMaxPatients: "Max Patients",
      colEmail: "Email",
      colCurrency: "Currency",
      colActions: "Actions",
      managePlanButton: "Manage plan payment",
      addOnChargeButton: "Add-on charge",
    },
    clinicsSection: {
      title: "Facilities Payment Management",
      description: "Select a facility to change plan and record subscription payment, or record an add-on charge (for example guided setup)",
      emptyTitle: "No facilities found",
      emptyDescription: "Facilities will appear here once they are provisioned for billing.",
      colFacilityName: "Facility Name",
      colCurrentTier: "Current Tier",
      colMaxDoctors: "Max Doctors",
      colMaxPatients: "Max Patients",
      colEmail: "Email",
      colCurrency: "Currency",
      colActions: "Actions",
      managePlanButton: "Manage plan payment",
      addOnChargeButton: "Add-on charge",
    },
    // Stub the dialog namespace so the test renders the existing
    // human strings (e.g. "Payment Processing - {clinic}").
    dialog: {
      title: "Payment Processing - {clinic}",
    },
  },
};

describe("PaymentProcessingPage", () => {
  beforeEach(() => {
    clientMocks.get.mockReset();
    clientMocks.post.mockReset();
    clientMocks.put.mockReset();
    clientMocks.delete.mockReset();
    toastSuccessMock.mockReset();
    showUserFacingErrorToastMock.mockReset();

    clientMocks.get.mockImplementation((url: string) => {
      if (url === "/internal/clinics") return Promise.resolve([clinic]);
      if (url === "/internal/tier-pricing") {
        return Promise.resolve({ tiers: tierPricing });
      }
      if (url === "/internal/billing/pricing/offers") return Promise.resolve([]);
      if (url === "/internal/clinics/clinic_1/tier-info") {
        return Promise.resolve({
          currentTier: "ESSENTIAL",
          maxDoctors: 20,
          maxPatients: 500,
          features: ["Standard"],
          pricing: 999,
        });
      }
      if (url === "/pricing/config?currency=INR") return Promise.resolve(pricingConfig);
      return Promise.reject(new Error(`Unexpected GET ${url}`));
    });
    clientMocks.post.mockResolvedValue({});
    clientMocks.put.mockResolvedValue({});
    clientMocks.delete.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("opens the payment dialog and processes a clinic payment", async () => {
    vi.spyOn(Date, "now").mockReturnValue(1770000000000);

    renderWithQueryClient(<PaymentProcessingPage />);

    expect((await screen.findAllByText("Care Clinic")).length).toBeGreaterThan(
      0,
    );
    fireEvent.click(
      screen.getByRole("button", { name: /Manage plan payment/i }),
    );

    const dialog = await screen.findByRole("dialog", {
      name: "Payment Processing - Care Clinic",
    });
    expect(within(dialog).getByText("Current Tier")).toBeInTheDocument();
    expect(within(dialog).getByDisplayValue("999")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Payment Notes (Optional)"), {
      target: { value: "GST invoice captured" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Process Payment" }));

    await waitFor(() => {
      expect(clientMocks.post).toHaveBeenCalledWith(
        "/internal/clinics/clinic_1/process-payment",
        {
          paymentId: "PAY_1770000000000",
          amount: 999,
          currency: "INR",
          newTier: "ESSENTIAL",
          paymentMethod: "razorpay",
          notes: "GST invoice captured",
        },
      );
    });
    expect(toastSuccessMock).toHaveBeenCalledWith(
      "Payment processed and tier updated successfully",
    );
  });

  it("records an add-on charge without changing tier", async () => {
    renderWithQueryClient(<PaymentProcessingPage />);

    expect((await screen.findAllByText("Care Clinic")).length).toBeGreaterThan(
      0,
    );
    fireEvent.click(screen.getByRole("button", { name: /Add-on charge/i }));

    const dialog = await screen.findByRole("dialog", {
      name: "Add-on charge — Care Clinic",
    });
    expect(within(dialog).getByLabelText("Amount (INR)")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Record charge" }));

    await waitFor(() => {
      expect(clientMocks.post).toHaveBeenCalledWith(
        "/internal/clinics/clinic_1/additional-charge",
        expect.objectContaining({
          amount: 4999,
          currency: "INR",
          category: "GUIDED_SETUP",
          paymentMethod: "manual",
        }),
      );
    });
    expect(toastSuccessMock).toHaveBeenCalledWith("Additional charge recorded");
  });

  it("shows an empty facilities state", async () => {
    clientMocks.get.mockImplementation((url: string) => {
      if (url === "/internal/clinics") return Promise.resolve([]);
      if (url === "/internal/tier-pricing") {
        return Promise.resolve({ tiers: tierPricing });
      }
      if (url === "/internal/billing/pricing/offers") return Promise.resolve([]);
      return Promise.reject(new Error(`Unexpected GET ${url}`));
    });

    renderWithQueryClient(<PaymentProcessingPage />);

    expect(await screen.findByText("No facilities found")).toBeInTheDocument();
  });

  it("reports plan detail loading failures", async () => {
    clientMocks.get.mockImplementation((url: string) => {
      if (url === "/internal/clinics") return Promise.resolve([clinic]);
      if (url === "/internal/tier-pricing") {
        return Promise.resolve({ tiers: tierPricing });
      }
      if (url === "/internal/billing/pricing/offers") return Promise.resolve([]);
      if (url === "/internal/clinics/clinic_1/tier-info") return Promise.reject(new Error("Tier info unavailable"));
      return Promise.reject(new Error(`Unexpected GET ${url}`));
    });

    renderWithQueryClient(<PaymentProcessingPage />);

    fireEvent.click(
      await screen.findByRole("button", { name: /Manage plan payment/i }),
    );

    await waitFor(() => {
      expect(showUserFacingErrorToastMock).toHaveBeenCalledWith(
        "We could not load these plan details. Please try again.",
      );
    });
  });
});
