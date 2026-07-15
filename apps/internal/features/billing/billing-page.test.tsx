import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextIntlClientProvider } from "next-intl";
import { DataAccessProvider, type RequestConfig } from "@workspace/data-access";
import BillingDashboard from "./billing-page";

const billingApiMocks = vi.hoisted(() => ({
  getMetrics: vi.fn(),
  getSubscriptions: vi.fn(),
  getPayments: vi.fn(),
  sendReminder: vi.fn(),
  extendGracePeriod: vi.fn(),
}));

vi.mock("@/lib/auth/auth", () => ({
  useAuth: () => ({
    token: "test-token",
    isLoading: false,
  }),
}));

vi.mock("@/lib/api/api", () => ({
  billingAPI: billingApiMocks,
}));

const graceSubscription = {
  id: "sub_1",
  clinic: {
    name: "Care Clinic",
    email: "billing@care.example",
    referralCreditsMonths: 0,
  },
  tier: "PROFESSIONAL",
  status: "GRACE_PERIOD",
  billingCycle: "MONTHLY",
  amount: 499900,
  currency: "INR",
  currentPeriodEnd: "2026-05-08T00:00:00.000Z",
};

const metrics = {
  mrr: 499900,
  arr: 5998800,
  activeSubscriptions: 1,
  trialSubscriptions: 0,
  churnRate: 0.02,
  expiringSubscriptions: [],
  gracePeriodSubscriptions: [graceSubscription],
  subscriptionsByTier: { PROFESSIONAL: 1 },
  subscriptionsByStatus: { GRACE_PERIOD: 1 },
  revenueByMonth: [{ month: "Apr 2026", revenue: 499900 }],
};

/**
 * Minimal next-intl message bundle for the billing dashboard tests.
 * The keys here mirror the InternalBilling.dashboard namespace in
 * apps/internal/messages/en.json. Any new t() key added to
 * BillingDashboardTabs that the tests depend on must be added here
 * too, otherwise the test renders the ICU fallback (the key path)
 * instead of the human string and `findByText` will fail.
 */
const messages = {
  InternalBilling: {
    dashboard: {
      tabSubscriptions: "Subscriptions",
      tabPayments: "Payments",
      tabRevenue: "Revenue Trends",
      filterTier: "Tier",
      filterStatus: "Status",
      filterBillingCycle: "Billing cycle",
      filterAllTiers: "All Tiers",
      filterAllStatuses: "All statuses",
      filterAllCycles: "All cycles",
      statusActive: "Active",
      statusTrial: "Trial",
      statusPastDue: "Past due",
      statusGracePeriod: "Grace period",
      statusCancelled: "Cancelled",
      statusExpired: "Expired",
      cycleMonthly: "Monthly",
      cycleYearly: "Yearly",
      colClinic: "Clinic",
      colTier: "Tier",
      colStatus: "Status",
      colBillingCycle: "Billing cycle",
      colAmount: "Amount",
      colPeriodEnd: "Period end",
      colCredits: "Credits",
      colActions: "Actions",
      colDate: "Date",
      colPlanService: "Plan / service",
      colGatewayId: "Gateway ID",
      emptySubscriptions: "No subscriptions found",
      emptyPayments: "No payments found",
      emptyRevenue: "No revenue data available",
      recentPayments: "Recent payments",
      recentPaymentsDescription: "Transaction history across all clinics",
      revenueByMonth: "Revenue by Month",
      revenueByMonthDescription: "Monthly revenue trends",
      creditsMonths: "{count} mo",
    },
  },
  // Some surfaces the dashboard dialogs read from use other namespaces.
  // Keep them here so the test renders the existing test copy
  // (e.g. "Extend Grace Period", "In Grace Period") without ICU
  // fallbacks leaking into the DOM.
  InternalBillingActions: {
    extendGracePeriod: "Extend",
    gracePeriodBadge: "In Grace Period",
    extendDialogTitle: "Extend Grace Period",
    extendDialogBody: "Extend the grace period for {clinicName}",
    daysLabel: "Days",
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
    options?: RequestConfig,
  ): Promise<T> => {
    if (endpoint === "/internal/billing/metrics") return billingApiMocks.getMetrics() as Promise<T>;
    if (endpoint === "/internal/billing/subscriptions") {
      return billingApiMocks.getSubscriptions(
        options?.params ?? {},
      ) as Promise<T>;
    }
    if (endpoint === "/internal/billing/payments") {
      return billingApiMocks.getPayments(options?.params ?? {}) as Promise<T>;
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

describe("BillingDashboard", () => {
  beforeEach(() => {
    billingApiMocks.getMetrics.mockReset();
    billingApiMocks.getSubscriptions.mockReset();
    billingApiMocks.getPayments.mockReset();
    billingApiMocks.sendReminder.mockReset();
    billingApiMocks.extendGracePeriod.mockReset();

    billingApiMocks.getMetrics.mockResolvedValue(metrics);
    billingApiMocks.getSubscriptions.mockResolvedValue([graceSubscription]);
    billingApiMocks.getPayments.mockResolvedValue([]);
    billingApiMocks.extendGracePeriod.mockResolvedValue(undefined);
  });

  it("opens the grace-period dialog and submits an extension", async () => {
    renderWithDataAccess(<BillingDashboard />);

    expect(await screen.findByText("In Grace Period")).toBeInTheDocument();
    expect(screen.getAllByText("Care Clinic").length).toBeGreaterThan(0);

    fireEvent.click(screen.getAllByRole("button", { name: "Extend" })[0]);

    const dialog = screen.getByRole("dialog", {
      name: "Extend Grace Period",
    });
    expect(
      within(dialog).getByText(/Extend the grace period for/),
    ).toHaveTextContent("Care Clinic");

    fireEvent.change(within(dialog).getByLabelText("Days"), {
      target: { value: "10" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Extend" }));

    await waitFor(() => {
      expect(billingApiMocks.extendGracePeriod).toHaveBeenCalledWith(
        "sub_1",
        10,
      );
    });
  });

  it("shows an empty subscription state when billing data is absent", async () => {
    billingApiMocks.getMetrics.mockResolvedValue({
      ...metrics,
      mrr: 0,
      arr: 0,
      activeSubscriptions: 0,
      gracePeriodSubscriptions: [],
      subscriptionsByTier: {},
      subscriptionsByStatus: {},
      revenueByMonth: [],
    });
    billingApiMocks.getSubscriptions.mockResolvedValue([]);

    renderWithDataAccess(<BillingDashboard />);

    expect(
      await screen.findByText("No subscriptions found"),
    ).toBeInTheDocument();
    expect(billingApiMocks.getPayments).toHaveBeenCalledWith({});
  });
});
