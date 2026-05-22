import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { CurrentUsage } from "@workspace/types";
import { CurrentPlanCard } from "./current-plan-card";
import { getTierInfo, Tier } from "@/lib/subscription/tier-access";

function buildUsage(): CurrentUsage {
  return {
    period: { start: "2026-05-01T00:00:00.000Z", end: "2026-05-31T23:59:59.000Z" },
    usage: { consultations: 2, users: 2, whatsappMessages: 1 },
    included: { consultations: 50, users: 3, whatsappMessages: 100 },
    overages: { consultations: 0, users: 0, whatsappMessages: 0 },
    rates: { consultations: 2, users: 10, whatsappMessages: 0.5 },
    breakdown: {
      consultations: { quantity: 0, rate: 2, charge: 0 },
      users: { quantity: 0, rate: 10, charge: 0 },
      whatsappMessages: { quantity: 0, rate: 0.5, charge: 0 },
    },
    total: 0,
    meters: {
      consultations: { current: 2, included: 50, overage: 0 },
      users: { current: 2, included: 3, overage: 0 },
      whatsappMessages: { current: 1, included: 100, overage: 0 },
    },
    warnings: {
      consultations: { percentUsed: 4, threshold: null },
      users: { percentUsed: 67, threshold: null },
      whatsappMessages: { percentUsed: 1, threshold: null },
    },
    tier: "ESSENTIAL",
  };
}

describe("CurrentPlanCard", () => {
  it("omits the WhatsApp usage row when showWhatsAppUsageMeter is false", () => {
    render(
      <CurrentPlanCard
        tierInfo={getTierInfo(Tier.STARTER)}
        currentTier={Tier.STARTER}
        hasIntelligence={false}
        canChangeTier
        onChangePlan={vi.fn()}
        onViewBillingHistory={vi.fn()}
        usage={buildUsage()}
        showWhatsAppUsageMeter={false}
      />,
    );

    expect(screen.getByText("Consultations")).toBeInTheDocument();
    expect(screen.getByText("Team members")).toBeInTheDocument();
    expect(screen.queryByText("WhatsApp")).not.toBeInTheDocument();
  });

  it("shows the WhatsApp usage row when showWhatsAppUsageMeter is true", () => {
    render(
      <CurrentPlanCard
        tierInfo={getTierInfo(Tier.ESSENTIAL)}
        currentTier={Tier.ESSENTIAL}
        hasIntelligence={false}
        canChangeTier
        onChangePlan={vi.fn()}
        onViewBillingHistory={vi.fn()}
        usage={buildUsage()}
        showWhatsAppUsageMeter
      />,
    );

    expect(screen.getByText("WhatsApp")).toBeInTheDocument();
  });
});
