import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PaymentStep } from "./PaymentStep";

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

if (!globalThis.ResizeObserver) {
  (
    globalThis as typeof globalThis & {
      ResizeObserver?: typeof ResizeObserverMock;
    }
  ).ResizeObserver = ResizeObserverMock;
}

vi.mock("@/lib/api/api-client", () => ({
  api: {
    post: vi.fn().mockRejectedValue(new Error("no backend in test")),
  },
}));

describe("PaymentStep", () => {
  it("calls onComplete immediately when plan price is zero (no checkout)", () => {
    const onComplete = vi.fn();

    render(
      <PaymentStep
        onComplete={onComplete}
        onBack={vi.fn()}
        selectedPlanPrice={0}
        billingCycle="MONTHLY"
        currencySymbol="₹"
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: /Continue \(No Payment Required\)/i }),
    );

    expect(onComplete).toHaveBeenCalledWith({
      autoPay: true,
    });
  });

  it("calls onBack when Back button is clicked", () => {
    const onBack = vi.fn();

    render(
      <PaymentStep
        onComplete={vi.fn()}
        onBack={onBack}
        selectedPlanPrice={1000}
        billingCycle="MONTHLY"
        currencySymbol="₹"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Back" }));

    expect(onBack).toHaveBeenCalled();
  });

});
