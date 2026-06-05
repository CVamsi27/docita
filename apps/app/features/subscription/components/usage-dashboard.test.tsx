import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CurrentUsage } from "@workspace/types";
import { UsageDashboard } from "./usage-dashboard";

const mockUsage: CurrentUsage = {
  period: { start: "2026-05-01T00:00:00.000Z", end: "2026-05-31T23:59:59.000Z" },
  usage: { consultations: 1, users: 1, whatsappMessages: 5, aiCredits: 42 },
  included: { consultations: 50, users: 3, whatsappMessages: 200, aiCredits: 500 },
  overages: { consultations: 0, users: 0, whatsappMessages: 0, aiCredits: 0 },
  rates: { consultations: 2, users: 10, whatsappMessages: 0.5, aiCredits: 0 },
  breakdown: {
    consultations: { quantity: 0, rate: 2, charge: 0 },
    users: { quantity: 0, rate: 10, charge: 0 },
    whatsappMessages: { quantity: 0, rate: 0.5, charge: 0 },
    aiCredits: { quantity: 0, rate: 0, charge: 0 },
  },
  total: 0,
  meters: {
    consultations: { current: 1, included: 50, overage: 0 },
    users: { current: 1, included: 3, overage: 0 },
    whatsappMessages: { current: 5, included: 200, overage: 0 },
    aiCredits: { current: 42, included: 500, overage: 0 },
  },
  warnings: {
    consultations: { percentUsed: 2, threshold: null },
    users: { percentUsed: 33, threshold: null },
    whatsappMessages: { percentUsed: 2.5, threshold: null },
    aiCredits: { percentUsed: 8.4, threshold: null },
  },
  tier: "ESSENTIAL",
};

const useCurrentUsageMock = vi.hoisted(() =>
  vi.fn(() => ({ usage: mockUsage, isLoading: false })),
);

const useSubscriptionMock = vi.hoisted(() =>
  vi.fn(() => ({ data: { tier: "STARTER" as const } })),
);

let currentTierForMock = "STARTER";

vi.mock("@/features/subscription/hooks/use-pricing", () => ({
  useCurrentUsage: () => useCurrentUsageMock(),
}));

vi.mock("@/hooks/use-clinic-currency", () => ({
  useClinicCurrency: () => ({
    currency: "INR",
    locale: "en-IN",
  }),
}));

vi.mock("@workspace/data-access", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@workspace/data-access")>();

  return {
    ...actual,
    useSubscription: () => useSubscriptionMock(),
  };
});

vi.mock("@/lib/stores/permission-store", () => ({
  usePermissionStore: (selector: (state: { canAccess: (feature: unknown) => boolean }) => boolean) => {
    return selector({
      canAccess: (feature: unknown) => {
        if (String(feature) === "WHATSAPP_MESSAGING") {
          return currentTierForMock !== "STARTER";
        }
        return true;
      },
    });
  },
}));

describe("UsageDashboard", () => {
  beforeEach(() => {
    currentTierForMock = "STARTER";
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
    currentTierForMock = "ESSENTIAL";
    useSubscriptionMock.mockReturnValue({ data: { tier: "ESSENTIAL" } });

    render(<UsageDashboard />);

    expect(screen.getByText("WhatsApp Messages")).toBeInTheDocument();
  });

  it("shows the AI credits meter when a tier allotment is configured", () => {
    useSubscriptionMock.mockReturnValue({ data: { tier: "ESSENTIAL" } });

    render(<UsageDashboard />);

    expect(screen.getByText("AI credits")).toBeInTheDocument();
  });
});
