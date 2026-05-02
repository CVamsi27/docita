import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Tier } from "@workspace/types";
import { TierChangeDialog } from "./tier-change-dialog";

const pricingMocks = vi.hoisted(() => ({
  usePricingConfig: vi.fn(),
}));

vi.mock("@/hooks/api/use-pricing", () => ({
  usePricingConfig: pricingMocks.usePricingConfig,
}));

vi.mock("@/hooks/api/use-billing", () => ({
  useProrationPreview: () => ({
    data: undefined,
    isFetching: false,
  }),
}));

const pricingConfig = {
  currency: "INR",
  tiers: [
    {
      id: "STARTER",
      pricing: { monthly: 0, yearly: 0 },
    },
    {
      id: "ESSENTIAL",
      pricing: { monthly: 999, yearly: 9990 },
    },
    {
      id: "PROFESSIONAL",
      pricing: { monthly: 2999, yearly: 29990 },
    },
  ],
};

describe("TierChangeDialog", () => {
  beforeEach(() => {
    pricingMocks.usePricingConfig.mockReturnValue({
      pricingConfig,
      isLoading: false,
    });
  });

  it("shows the plan price delta and confirms an upgrade", async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    const onOpenChange = vi.fn();

    render(
      <TierChangeDialog
        open
        onOpenChange={onOpenChange}
        currentTier={Tier.STARTER}
        selectedTier="ESSENTIAL"
        billingCycle="MONTHLY"
        currency="INR"
        onConfirm={onConfirm}
      />,
    );

    expect(screen.getByText("Current plan")).toBeInTheDocument();
    expect(screen.getByText("Selected plan")).toBeInTheDocument();
    expect(screen.getByText(/Additional cost:/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Confirm Upgrade" }));

    await waitFor(() => {
      expect(onConfirm).toHaveBeenCalled();
    });
    expect(await screen.findByText("Plan Updated!")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Done" }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("surfaces confirmation errors without closing the dialog", async () => {
    const onConfirm = vi.fn().mockRejectedValue(new Error("payment failed"));
    const onOpenChange = vi.fn();

    render(
      <TierChangeDialog
        open
        onOpenChange={onOpenChange}
        currentTier={Tier.PROFESSIONAL}
        selectedTier="ESSENTIAL"
        billingCycle="YEARLY"
        currency="INR"
        onConfirm={onConfirm}
      />,
    );

    expect(
      screen.getByText(/Downgrading will limit your access/i),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Confirm Downgrade" }));

    expect(await screen.findByText("payment failed")).toBeInTheDocument();
    expect(onOpenChange).not.toHaveBeenCalled();
  });
});
