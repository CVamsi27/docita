import { describe, expect, it } from "vitest";
import type { BillingHistoryItem } from "@workspace/data-access";
import {
  isBillingRowPaid,
  resolveBillingAmountCents,
} from "./billing-history-table-helpers";

const baseRow: BillingHistoryItem = {
  id: "pay-1",
  amountCents: 24000000,
  currency: "INR",
  status: "SUCCEEDED",
  createdAt: "2026-05-28T00:00:00.000Z",
};

describe("billing-history-table-helpers", () => {
  it("treats legacy SUCCEEDED rows with paidAt as paid", () => {
    expect(
      isBillingRowPaid({
        ...baseRow,
        paidAt: "2026-05-28T10:00:00.000Z",
      }),
    ).toBe(true);
  });

  it("treats succeeded status as paid without paidAt", () => {
    expect(isBillingRowPaid({ ...baseRow, status: "succeeded" })).toBe(true);
  });

  it("resolves paid total from grandTotalCents when amountCents is zero", () => {
    expect(
      resolveBillingAmountCents({
        ...baseRow,
        amountCents: 0,
        grandTotalCents: 24000000,
      }),
    ).toBe(24000000);
  });
});
