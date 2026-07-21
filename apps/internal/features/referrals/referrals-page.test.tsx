import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextIntlClientProvider } from "next-intl";
import { DataAccessProvider, type RequestConfig } from "@workspace/data-access";
import ReferralsPage from "./referrals-page";

const apiMocks = vi.hoisted(() => ({
  getReferrers: vi.fn(),
  getPayouts: vi.fn(),
  getPayoutSummary: vi.fn(),
  post: vi.fn(),
}));

const tokenState = vi.hoisted(() => ({
  token: "test-token",
  isInternal: true,
}));

vi.mock("@/lib/auth/auth", () => ({
  useAuth: () => ({
    token: tokenState.token,
    isLoading: false,
    isInternal: tokenState.isInternal,
  }),
}));

vi.mock("@/lib/api/api-client", () => ({
  client: {
    post: apiMocks.post,
  },
}));

const referrerA = {
  id: "ref_1",
  type: "MARKETING_PERSON",
  rewardKind: "REVENUE_SHARE",
  name: "Acme Marketing",
  email: "ops@acme.example",
  phone: null,
  clinicId: null,
  rateBands: null,
  payoutDetails: null,
  firstYearOnly: true,
  active: true,
  createdAt: "2026-07-01T00:00:00.000Z",
  updatedAt: "2026-07-01T00:00:00.000Z",
};

const referrerB = {
  ...referrerA,
  id: "ref_2",
  type: "CLINIC",
  rewardKind: "CREDIT_MONTHS",
  name: "Referral Clinic",
  email: null,
  phone: "+911234567890",
  active: false,
};

const payoutPending = {
  id: "po_1",
  referralId: "ref_referred_1",
  referrerId: "ref_1",
  periodStart: "2026-06-01T00:00:00.000Z",
  periodEnd: "2026-06-30T23:59:59.000Z",
  baseRevenueCents: 1000000,
  ratePercent: 10,
  amountCents: 100000,
  status: "PENDING",
  paidAt: null,
  createdAt: "2026-07-01T00:00:00.000Z",
  updatedAt: "2026-07-01T00:00:00.000Z",
};

const payoutPaid = {
  ...payoutPending,
  id: "po_2",
  amountCents: 50000,
  status: "PAID",
  paidAt: "2026-07-05T00:00:00.000Z",
};

const summaryRows = [
  { status: "PENDING", count: 1, totalCents: 100000 },
  { status: "PAID", count: 1, totalCents: 50000 },
];

/**
 * Local messages mirror for the InternalReferrals namespace — the test
 * renders ReferralsPage via NextIntlClientProvider so useTranslations
 * resolves against these English strings.
 */
const messages = {
  InternalReferrals: {
    pageTitle: "Referrals",
    pageDescription: "Referral partners and the revenue-share payout ledger. Payouts are disbursed manually — mark a row paid once you have sent the money.",
    payoutSummary: "Payout summary",
    payoutsCount: "{count} payout(s)",
    noPayoutsYet: "No payouts yet.",
    addReferrer: "Add referrer",
    nameRequiredWarning: "Enter the referrer's name to continue",
    typeLabel: "Type",
    nameLabel: "Name",
    namePlaceholder: "Partner name",
    emailLabel: "Email",
    phoneLabel: "Phone",
    optionalPlaceholder: "optional",
    saving: "Saving…",
    addButton: "Add",
    referrers: "Referrers",
    colName: "Name",
    colType: "Type",
    colReward: "Reward",
    colContact: "Contact",
    colActive: "Active",
    colPeriodStart: "Period start",
    colBaseRevenue: "Base revenue",
    colRate: "Rate",
    colAmount: "Amount",
    colStatus: "Status",
    payoutLedger: "Payout ledger",
    active: "Active",
    inactive: "Inactive",
    markPaidButton: "Mark paid",
    referrerCreatedToast: "Referrer created",
    referrerCreateError: "Please review the referrer details and try again",
    payoutMarkedPaidToast: "Payout marked paid",
    payoutMarkPaidError: "Please try marking this payout as paid again",
  },
};

function renderWithDataAccess(ui: ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  const fetcher = <T,>(
    endpoint: string,
    _options?: RequestConfig,
  ): Promise<T> => {
    if (endpoint === "/internal/referrers") {
      return apiMocks.getReferrers() as Promise<T>;
    }
    if (endpoint.startsWith("/internal/referral-payouts?")) {
      return apiMocks.getPayouts() as Promise<T>;
    }
    if (endpoint === "/internal/referral-payouts") {
      return apiMocks.getPayouts() as Promise<T>;
    }
    if (endpoint === "/internal/referral-payouts/summary") {
      return apiMocks.getPayoutSummary() as Promise<T>;
    }
    return Promise.reject(new Error(`Unexpected data-access GET ${endpoint}`));
  };
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

describe("ReferralsPage", () => {
  beforeEach(() => {
    apiMocks.getReferrers.mockReset();
    apiMocks.getPayouts.mockReset();
    apiMocks.getPayoutSummary.mockReset();
    apiMocks.post.mockReset();

    apiMocks.getReferrers.mockResolvedValue([referrerA, referrerB]);
    apiMocks.getPayouts.mockResolvedValue([payoutPending, payoutPaid]);
    apiMocks.getPayoutSummary.mockResolvedValue(summaryRows);
  });

  it("renders referrers and payout summary cards", async () => {
    renderWithDataAccess(<ReferralsPage />);

    expect(await screen.findByText("Acme Marketing")).toBeInTheDocument();
    expect(screen.getByText("Referral Clinic")).toBeInTheDocument();
    // The select trigger and the type cell both render the type label, so
    // there are multiple matches. We just need at least one of each.
    expect(screen.getAllByText("MARKETING_PERSON").length).toBeGreaterThan(0);
    expect(screen.getAllByText("CLINIC").length).toBeGreaterThan(0);
    // "Active" appears as both the column header and the badge label for
    // the active referrer; same for "Inactive".
    expect(screen.getAllByText("Active").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Inactive").length).toBeGreaterThan(0);

    // Summary cards render the total + count for each status. We assert
    // each summary card text contains a ₹ formatted value (locale-agnostic:
    // en-IN groups digits differently across Node versions, so we just
    // check that *some* formatted rupee value is shown).
    const summarySection = screen
      .getByText("Payout summary")
      .closest("section") as HTMLElement;
    expect(summarySection.textContent).toMatch(/₹[\d,.]+/);
    expect(screen.getAllByText(/1 payout/).length).toBeGreaterThanOrEqual(2);
  });

  it("renders the payout ledger with a Mark paid action only on payable rows", async () => {
    renderWithDataAccess(<ReferralsPage />);

    await screen.findByText("Acme Marketing");

    // Both payouts land in the ledger, but only PENDING rows get the action.
    const markPaidButtons = screen.getAllByRole("button", { name: "Mark paid" });
    expect(markPaidButtons).toHaveLength(1);
  });

  it("submits the add-referrer form and posts to /internal/referrers", async () => {
    apiMocks.post.mockResolvedValueOnce({
      id: "ref_new",
      type: "PHARMACY",
      rewardKind: "REVENUE_SHARE",
      name: "City Pharmacy",
      email: "ops@pharmacy.example",
      phone: null,
      clinicId: null,
      rateBands: null,
      payoutDetails: null,
      firstYearOnly: true,
      active: true,
      createdAt: "2026-07-14T00:00:00.000Z",
      updatedAt: "2026-07-14T00:00:00.000Z",
    });

    renderWithDataAccess(<ReferralsPage />);

    await screen.findByText("Acme Marketing");

    fireEvent.change(screen.getByPlaceholderText("Partner name"), {
      target: { value: "City Pharmacy" },
    });
    const [emailInput, phoneInput] =
      screen.getAllByPlaceholderText("optional");
    fireEvent.change(emailInput, { target: { value: "ops@pharmacy.example" } });
    fireEvent.change(phoneInput, { target: { value: "+911234567890" } });
    fireEvent.click(screen.getByRole("button", { name: "Add" }));

    await waitFor(() => {
      expect(apiMocks.post).toHaveBeenCalledWith(
        "/internal/referrers",
        expect.objectContaining({
          name: "City Pharmacy",
          email: "ops@pharmacy.example",
          phone: "+911234567890",
        }),
      );
    });
  });

  it("blocks submit when the name is empty and does not POST", async () => {
    renderWithDataAccess(<ReferralsPage />);

    await screen.findByText("Acme Marketing");

    // Type a name, then clear it — submit should be a no-op.
    const nameInput = screen.getByPlaceholderText("Partner name");
    fireEvent.change(nameInput, { target: { value: "Draft" } });
    fireEvent.change(nameInput, { target: { value: "   " } });
    fireEvent.click(screen.getByRole("button", { name: "Add" }));

    expect(apiMocks.post).not.toHaveBeenCalled();
  });

  it("marks a payout paid via the row action and invalidates the ledger", async () => {
    apiMocks.post.mockResolvedValueOnce({ id: "po_1", status: "PAID" });

    renderWithDataAccess(<ReferralsPage />);

    await screen.findByText("Acme Marketing");
    fireEvent.click(screen.getByRole("button", { name: "Mark paid" }));

    await waitFor(() => {
      expect(apiMocks.post).toHaveBeenCalledWith(
        "/internal/referral-payouts/po_1/mark-paid",
        {},
      );
    });
  });
});
