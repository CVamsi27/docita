import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SUBSCRIPTION_SETTINGS_PATH } from "@/lib/subscription-settings-path";
import { PaymentSuccessModal } from "./payment-success-modal";

const navigationMocks = vi.hoisted(() => ({
  push: vi.fn(),
}));

vi.mock("canvas-confetti", () => ({
  default: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => navigationMocks,
}));

vi.mock("@/hooks/use-clinic-currency", () => ({
  useClinicCurrency: () => ({
    formatCurrency: (amount: number) => `INR ${amount.toFixed(0)}`,
  }),
}));

describe("PaymentSuccessModal", () => {
  beforeEach(() => {
    navigationMocks.push.mockReset();
  });

  it("renders payment details and routes to the dashboard", () => {
    const onOpenChange = vi.fn();

    render(
      <PaymentSuccessModal
        open
        onOpenChange={onOpenChange}
        planName="Professional"
        amount={2999}
        transactionId="txn_12345678"
      />,
    );

    expect(screen.getByText("Payment Successful!")).toBeInTheDocument();
    expect(screen.getByText("Professional")).toBeInTheDocument();
    expect(screen.getByText("INR 2999")).toBeInTheDocument();
    expect(screen.getByText("12345678")).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "Continue to Dashboard" }),
    );

    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(navigationMocks.push).toHaveBeenCalledWith("/dashboard");
  });

  it("supports managing the subscription or closing the modal", () => {
    const onOpenChange = vi.fn();

    render(
      <PaymentSuccessModal
        open
        onOpenChange={onOpenChange}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Manage Subscription" }),
    );
    expect(navigationMocks.push).toHaveBeenCalledWith(
      SUBSCRIPTION_SETTINGS_PATH,
    );

    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
