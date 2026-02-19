import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PaymentStep } from "./PaymentStep";

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

if (!globalThis.ResizeObserver) {
  // @ts-expect-error jsdom test shim
  globalThis.ResizeObserver = ResizeObserverMock;
}

describe("PaymentStep", () => {
  it("shows red field validation messages on submit for all invalid required fields", () => {
    const onComplete = vi.fn();

    render(
      <PaymentStep
        onComplete={onComplete}
        onBack={vi.fn()}
        selectedPlanPrice={1000}
        billingCycle="MONTHLY"
        currencySymbol="₹"
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Complete Payment & Continue" }),
    );

    expect(screen.getByText("Name on card is required")).toBeInTheDocument();
    expect(screen.getByText("Enter a valid card number")).toBeInTheDocument();
    expect(screen.getByText("Use MM/YY format")).toBeInTheDocument();
    expect(screen.getByText("Enter a valid CVC")).toBeInTheDocument();

    expect(screen.getByLabelText("Name on Card")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(screen.getByLabelText("Card Number")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(screen.getByLabelText("Expiry")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(screen.getByLabelText("CVC")).toHaveAttribute("aria-invalid", "true");

    expect(onComplete).not.toHaveBeenCalled();
  });

  it("submits when all fields are valid", () => {
    const onComplete = vi.fn();

    render(
      <PaymentStep
        onComplete={onComplete}
        onBack={vi.fn()}
        selectedPlanPrice={1000}
        billingCycle="MONTHLY"
        currencySymbol="₹"
      />,
    );

    fireEvent.change(screen.getByLabelText("Name on Card"), {
      target: { value: "Dr John" },
    });
    fireEvent.change(screen.getByLabelText("Card Number"), {
      target: { value: "4242424242424242" },
    });
    fireEvent.change(screen.getByLabelText("Expiry"), {
      target: { value: "12/30" },
    });
    fireEvent.change(screen.getByLabelText("CVC"), {
      target: { value: "123" },
    });

    fireEvent.click(
      screen.getByRole("button", { name: "Complete Payment & Continue" }),
    );

    expect(onComplete).toHaveBeenCalledWith({
      cardNumber: "4242",
      autoPay: true,
      addons: {
        intelligence: false,
      },
    });
  });

  it("clears field error when the user edits that field after submit", () => {
    render(
      <PaymentStep
        onComplete={vi.fn()}
        onBack={vi.fn()}
        selectedPlanPrice={1000}
        billingCycle="MONTHLY"
        currencySymbol="₹"
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Complete Payment & Continue" }),
    );
    expect(screen.getByText("Name on card is required")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Name on Card"), {
      target: { value: "Dr Jane" },
    });

    expect(screen.queryByText("Name on card is required")).not.toBeInTheDocument();
  });
});
