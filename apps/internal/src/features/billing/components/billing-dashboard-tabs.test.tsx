import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { BillingDashboardTabs } from "./billing-dashboard-tabs";
import { MemoryRouter } from "react-router";

const mockSubscriptions = [
  {
    id: "sub-1",
    clinic: { name: "Test Clinic", email: "test@clinic.com", referralCreditsMonths: 0 },
    tier: "ESSENTIAL",
    status: "ACTIVE",
    billingCycle: "MONTHLY",
    amount: 5000,
    currency: "INR",
    currentPeriodEnd: "2026-08-01",
  },
];

const mockPayments = [
  {
    id: "pay-1",
    clinicName: "Test Clinic",
    planLabel: "Essential",
    amount: 5000,
    currency: "INR",
    status: "SUCCESS",
    paidAt: "2026-07-01",
    createdAt: "2026-07-01",
    gatewayPaymentId: "pay_gateway_1",
  },
];

function renderWithProviders(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

describe("BillingDashboardTabs", () => {
  it("renders all tab triggers", () => {
    renderWithProviders(
      <BillingDashboardTabs
        subscriptions={mockSubscriptions}
        payments={mockPayments}
        sending={false}
        tierFilter="all"
        statusFilter="all"
        billingCycleFilter="all"
        onTierFilterChange={vi.fn()}
        onStatusFilterChange={vi.fn()}
        onBillingCycleFilterChange={vi.fn()}
        onSendReminder={vi.fn()}
        onExtendGracePeriod={vi.fn()}
      />,
    );
    expect(screen.getByRole("tab", { name: /subscriptions/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /payments/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /revenue/i })).toBeInTheDocument();
  });

  it("renders subscription rows from data", () => {
    renderWithProviders(
      <BillingDashboardTabs
        subscriptions={mockSubscriptions}
        payments={mockPayments}
        sending={false}
        tierFilter="all"
        statusFilter="all"
        billingCycleFilter="all"
        onTierFilterChange={vi.fn()}
        onStatusFilterChange={vi.fn()}
        onBillingCycleFilterChange={vi.fn()}
        onSendReminder={vi.fn()}
        onExtendGracePeriod={vi.fn()}
      />,
    );
    expect(screen.getByText("Test Clinic")).toBeInTheDocument();
    expect(screen.getByText("ESSENTIAL")).toBeInTheDocument();
    expect(screen.getByText("ACTIVE")).toBeInTheDocument();
  });

  it("shows empty state when no subscriptions", () => {
    renderWithProviders(
      <BillingDashboardTabs
        subscriptions={[]}
        payments={[]}
        sending={false}
        tierFilter="all"
        statusFilter="all"
        billingCycleFilter="all"
        onTierFilterChange={vi.fn()}
        onStatusFilterChange={vi.fn()}
        onBillingCycleFilterChange={vi.fn()}
        onSendReminder={vi.fn()}
        onExtendGracePeriod={vi.fn()}
      />,
    );
    expect(screen.getByText("No subscriptions found")).toBeInTheDocument();
  });
});
