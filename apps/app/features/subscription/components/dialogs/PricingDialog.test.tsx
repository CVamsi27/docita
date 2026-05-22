import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Tier } from "@workspace/types";
import { PricingDialog } from "./pricing-dialog";

const pricingDialogMocks = vi.hoisted(() => ({
  usePricingConfig: vi.fn(),
  useTierEstimates: vi.fn(),
  useLocaleCurrency: vi.fn(),
}));

vi.mock("@/features/subscription/hooks/use-pricing", () => ({
  usePricingConfig: pricingDialogMocks.usePricingConfig,
  useTierEstimates: pricingDialogMocks.useTierEstimates,
}));

vi.mock("@/hooks/use-locale-currency", () => ({
  useLocaleCurrency: pricingDialogMocks.useLocaleCurrency,
}));

const pricingConfig = {
  currency: "INR",
  tiers: [
    {
      id: "STARTER",
      pricing: { monthly: 0, yearly: 0 },
      features: ["Basic patient records"],
    },
    {
      id: "FRONT_DESK",
      pricing: { monthly: 799, yearly: 7990 },
      features: ["Queue", "Reception-first"],
    },
    {
      id: "ESSENTIAL",
      pricing: { monthly: 999, yearly: 9990 },
      features: ["Invoices", "WhatsApp reminders"],
    },
    {
      id: "PROFESSIONAL",
      pricing: { monthly: 2999, yearly: 29990 },
      features: ["Inventory", "Lab tests"],
    },
    {
      id: "ENTERPRISE",
      pricing: { monthly: "custom", yearly: "custom" },
      features: ["Dedicated success"],
    },
  ],
};

describe("PricingDialog", () => {
  beforeEach(() => {
    pricingDialogMocks.useLocaleCurrency.mockReturnValue({ currency: "INR" });
    pricingDialogMocks.usePricingConfig.mockReturnValue({ pricingConfig });
    pricingDialogMocks.useTierEstimates.mockReturnValue({
      estimateByTier: {
        STARTER: {
          totalMonthly: 0,
          totalYearly: 0,
          currency: { symbol: "₹" },
        },
        FRONT_DESK: {
          totalMonthly: 799,
          totalYearly: 7990,
          currency: { symbol: "₹" },
        },
        ESSENTIAL: {
          totalMonthly: 999,
          totalYearly: 9990,
          currency: { symbol: "₹" },
        },
        PROFESSIONAL: {
          totalMonthly: 2999,
          totalYearly: 29990,
          currency: { symbol: "₹" },
        },
      },
      isLoadingAny: false,
    });
  });

  it("shows current plan, usage estimates, and selects a monthly upgrade", () => {
    const onSelectTier = vi.fn();

    render(
      <PricingDialog
        open
        onOpenChange={vi.fn()}
        currentTier={Tier.STARTER}
        onSelectTier={onSelectTier}
        initialCurrency="INR"
      />,
    );

    expect(screen.getByText("Choose Your Plan")).toBeInTheDocument();
    expect(screen.getByText("Current")).toBeInTheDocument();
    expect(screen.getByText("₹999/mo")).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole("button", { name: "Upgrade" })[0]!);

    expect(onSelectTier).toHaveBeenCalledWith("FRONT_DESK", "MONTHLY");
  });

  it("switches to yearly billing and closes from contact sales", () => {
    const onOpenChange = vi.fn();
    const onSelectTier = vi.fn();

    render(
      <PricingDialog
        open
        onOpenChange={onOpenChange}
        currentTier={Tier.ESSENTIAL}
        onSelectTier={onSelectTier}
        initialCurrency="INR"
      />,
    );

    fireEvent.click(screen.getByRole("switch"));
    expect(screen.getByText("2 months free")).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole("button", { name: "Upgrade" })[0]!);
    expect(onSelectTier).toHaveBeenCalledWith("FRONT_DESK", "YEARLY");

    fireEvent.click(screen.getByRole("button", { name: "Contact sales" }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
