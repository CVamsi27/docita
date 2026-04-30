import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BillingHistoryTable } from "./BillingHistoryTable";

const resumePaymentMock = vi.hoisted(() => ({
  mutateAsync: vi.fn(),
}));

vi.mock("@/hooks/api/use-resume-subscription-payment", () => ({
  useResumeSubscriptionPayment: () => ({
    isPending: false,
    mutateAsync: resumePaymentMock.mutateAsync,
  }),
}));

describe("BillingHistoryTable", () => {
  beforeEach(() => {
    resumePaymentMock.mutateAsync.mockReset();
    vi.spyOn(window, "open").mockImplementation(() => null);
  });

  it("treats pending invoiceUrl as a payment link instead of a receipt", () => {
    render(
      <BillingHistoryTable
        invoices={[
          {
            id: "pending-1",
            amountCents: 99900,
            amount: 999,
            currency: "INR",
            status: "pending",
            description: "ESSENTIAL MONTHLY subscription",
            invoiceUrl: "https://rzp.io/i/pending",
            createdAt: "2026-04-28T00:00:00.000Z",
          },
        ]}
      />,
    );

    expect(
      screen.queryByRole("button", { name: /pdf/i }),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /pay now/i }));

    expect(window.open).toHaveBeenCalledWith(
      "https://rzp.io/i/pending",
      "_blank",
    );
    expect(resumePaymentMock.mutateAsync).not.toHaveBeenCalled();
  });

  it("shows paid rows as receipts", () => {
    render(
      <BillingHistoryTable
        invoices={[
          {
            id: "paid-1",
            amountCents: 99900,
            amount: 999,
            currency: "INR",
            status: "paid",
            description: "ESSENTIAL MONTHLY subscription",
            receiptUrl: "/subscription/billing/payments/paid-1/invoice.pdf",
            createdAt: "2026-04-28T00:00:00.000Z",
          },
        ]}
      />,
    );

    expect(screen.getByRole("button", { name: /pdf/i })).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /pay now/i }),
    ).not.toBeInTheDocument();
  });

  it("formats each row using the stored billing currency", () => {
    render(
      <BillingHistoryTable
        invoices={[
          {
            id: "usd-1",
            amountCents: 2500,
            amount: 25,
            currency: "USD",
            status: "paid",
            description: "ESSENTIAL MONTHLY subscription",
            createdAt: "2026-04-28T00:00:00.000Z",
          },
        ]}
      />,
    );

    expect(screen.getByText("$25.00")).toBeInTheDocument();
  });
});
