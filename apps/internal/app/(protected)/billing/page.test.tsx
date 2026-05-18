import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import BillingDashboard from "./page";

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
  tier: "PLUS",
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
  subscriptionsByTier: { PLUS: 1 },
  subscriptionsByStatus: { GRACE_PERIOD: 1 },
  revenueByMonth: [{ month: "Apr 2026", revenue: 499900 }],
};

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
    render(<BillingDashboard />);

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

    render(<BillingDashboard />);

    expect(
      await screen.findByText("No subscriptions found"),
    ).toBeInTheDocument();
    expect(billingApiMocks.getPayments).toHaveBeenCalledWith({});
  });
});
