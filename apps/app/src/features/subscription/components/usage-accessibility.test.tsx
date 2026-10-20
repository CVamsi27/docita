import { screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { currentUsageSchema } from "@workspace/types";
import { render } from "@/test-utils";
import { CurrentPlanCardUsage } from "./cards/current-plan-card-usage";
import { UsageDashboardMetersPanel } from "./usage-dashboard-sections";

const zero = { consultations: 0, users: 0, whatsappMessages: 0, aiCredits: 0 };
const meter = { current: 5, included: 10, overage: 0 };
const charge = { quantity: 0, rate: 0, charge: 0 };
const warning = { percentUsed: 50, threshold: null };
const usage = currentUsageSchema.parse({
  period: { start: "2026-10-01", end: "2026-10-31" },
  usage: zero,
  included: zero,
  overages: zero,
  rates: zero,
  breakdown: {
    consultations: charge,
    users: charge,
    whatsappMessages: charge,
    aiCredits: charge,
  },
  total: 0,
  meters: {
    consultations: meter,
    users: meter,
    whatsappMessages: meter,
    aiCredits: meter,
  },
  warnings: {
    consultations: warning,
    users: warning,
    whatsappMessages: warning,
    aiCredits: warning,
  },
  tier: "ESSENTIAL",
});

it("names current-plan progress bars using their visible usage labels", () => {
  render(<CurrentPlanCardUsage usage={usage} />);
  for (const name of ["Consultations", "Team members", "WhatsApp"]) {
    expect(screen.getByRole("progressbar", { name })).toHaveAttribute(
      "aria-valuenow",
      "50",
    );
  }
});

it("names detailed progress bars without changing usage calculation", () => {
  render(
    <UsageDashboardMetersPanel
      periodStart="1 October"
      periodEnd="31 October"
      totalOverageCost={0}
      symbol="INR"
      amountLocale="en-IN"
      amountFractionDigits={2}
      meters={usage.meters}
      rates={usage.rates}
      showWhatsAppMeter
      warningEntries={[]}
    />,
  );
  for (const name of [
    "Consultations",
    "Team members",
    "AI credits",
    "WhatsApp Messages",
  ]) {
    expect(screen.getByRole("progressbar", { name })).toHaveAttribute(
      "aria-valuenow",
      "50",
    );
  }
});
