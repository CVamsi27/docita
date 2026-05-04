import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CurrentUsage } from "@workspace/types";
import { UsageDashboard } from "./usage-dashboard";

const mockUsage: CurrentUsage = {
  period: { start: "2026-05-01T00:00:00.000Z", end: "2026-05-31T23:59:59.000Z" },
  usage: { consultations: 1, users: 1, whatsappMessages: 5 },
  included: { consultations: 50, users: 3, whatsappMessages: 200 },
  overages: { consultations: 0, users: 0, whatsappMessages: 0 },
  rates: { consultations: 2, users: 10, whatsappMessages: 0.5 },
  breakdown: {
    consultations: { quantity: 0, rate: 2, charge: 0 },
    users: { quantity: 0, rate: 10, charge: 0 },
    whatsappMessages: { quantity: 0, rate: 0.5, charge: 0 },
  },
  total: 0,
  meters: {
    consultations: { current: 1, included: 50, overage: 0 },
    users: { current: 1, included: 3, overage: 0 },
    whatsappMessages: { current: 5, included: 200, overage: 0 },
  },
  warnings: {
    consultations: { percentUsed: 2, threshold: null },
    users: { percentUsed: 33, threshold: null },
    whatsappMessages: { percentUsed: 2.5, threshold: null },
  },
  tier: "ESSENTIAL",
};

const useCurrentUsageMock = vi.hoisted(() =>
  vi.fn(() => ({ usage: mockUsage, isLoading: false })),
);

const useSubscriptionMock = vi.hoisted(() =>
  vi.fn(() => ({ data: { tier: "STARTER" as const } })),
);

vi.mock("@/hooks/api/use-pricing", () => ({
  useCurrentUsage: () => useCurrentUsageMock(),
}));

vi.mock("@/hooks/use-clinic-currency", () => ({
  useClinicCurrency: () => ({
    currency: "INR",
    locale: "en-IN",
  }),
}));

vi.mock("@/hooks/api/use-settings", () => ({
  useSubscription: () => useSubscriptionMock(),
}));

describe("UsageDashboard", () => {
  beforeEach(() => {
    useSubscriptionMock.mockReturnValue({ data: { tier: "STARTER" } });
    useCurrentUsageMock.mockReturnValue({ usage: mockUsage, isLoading: false });
  });

  it("shows Starter upgrade copy instead of the WhatsApp meter", () => {
    render(<UsageDashboard />);

    expect(
      screen.getByText(/Patient WhatsApp messaging is not included on Starter/i),
    ).toBeInTheDocument();
    expect(screen.queryByText("WhatsApp Messages")).not.toBeInTheDocument();
  });

  it("shows the WhatsApp meter for Essential tier", () => {
    useSubscriptionMock.mockReturnValue({ data: { tier: "ESSENTIAL" } });

    render(<UsageDashboard />);

    expect(screen.getByText("WhatsApp Messages")).toBeInTheDocument();
  });
});
