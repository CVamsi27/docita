import { describe, expect, it } from "vitest";
import { findRecoverableSubscriptionPayment } from "./recoverable-subscription-payment";

describe("findRecoverableSubscriptionPayment", () => {
  it("returns null when history is empty", () => {
    expect(findRecoverableSubscriptionPayment(undefined)).toBeNull();
    expect(findRecoverableSubscriptionPayment([])).toBeNull();
  });

  it("returns the first recoverable pending payment", () => {
    const match = findRecoverableSubscriptionPayment([
      {
        id: "paid-1",
        amountCents: 99900,
        currency: "INR",
        status: "paid",
        createdAt: "2026-05-10T00:00:00.000Z",
      },
      {
        id: "pending-1",
        amountCents: 99900,
        currency: "INR",
        status: "pending",
        createdAt: "2026-05-17T00:00:00.000Z",
      },
    ]);

    expect(match?.id).toBe("pending-1");
  });

  it("treats due and processing statuses as recoverable", () => {
    expect(
      findRecoverableSubscriptionPayment([
        {
          id: "due-1",
          amountCents: 100,
          currency: "INR",
          status: "due",
          createdAt: "2026-05-17T00:00:00.000Z",
        },
      ])?.id,
    ).toBe("due-1");
  });

  it("ignores paid and expired rows", () => {
    expect(
      findRecoverableSubscriptionPayment([
        {
          id: "expired-1",
          amountCents: 100,
          currency: "INR",
          status: "expired",
          createdAt: "2026-05-17T00:00:00.000Z",
        },
      ]),
    ).toBeNull();
  });
});
