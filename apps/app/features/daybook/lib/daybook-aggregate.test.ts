import { describe, expect, it } from "vitest";
import type { InvoiceListRow } from "@workspace/types";
import { aggregateDaybook } from "./daybook-aggregate";

function row(partial: Partial<InvoiceListRow>): InvoiceListRow {
  return {
    id: "inv-1",
    patientId: "p-1",
    status: "PAID",
    total: 0,
    createdAt: "2026-05-31T10:00:00.000Z",
    ...partial,
  } as InvoiceListRow;
}

describe("aggregateDaybook", () => {
  it("returns zeros for no invoices", () => {
    const s = aggregateDaybook([]);
    expect(s).toMatchObject({
      collected: 0,
      pending: 0,
      cashOnHand: 0,
      invoiceCount: 0,
      paidCount: 0,
    });
    expect(s.byMethod).toEqual([]);
    expect(s.ledger).toEqual([]);
  });

  it("sums collected/pending/cash and groups by method, excluding cancelled", () => {
    const s = aggregateDaybook([
      row({ id: "a", status: "PAID", grandTotal: 100, paymentMethod: "cash" as never }),
      row({ id: "b", status: "PAID", grandTotal: 250, paymentMethod: "upi" as never }),
      row({ id: "c", status: "PAID", total: 50, paymentMethod: "cash" as never }),
      row({ id: "d", status: "PENDING", grandTotal: 400 }),
      row({ id: "e", status: "OVERDUE", grandTotal: 75 }),
      row({ id: "f", status: "CANCELLED", grandTotal: 999, paymentMethod: "cash" as never }),
    ]);

    expect(s.collected).toBe(400); // 100 + 250 + 50
    expect(s.cashOnHand).toBe(150); // 100 + 50
    expect(s.pending).toBe(475); // 400 + 75
    expect(s.paidCount).toBe(3);
    expect(s.invoiceCount).toBe(5); // cancelled excluded from ledger

    const cash = s.byMethod.find((m) => m.method === "cash");
    expect(cash).toMatchObject({ count: 2, total: 150, label: "Cash" });
    // sorted by total desc → upi (250) before cash (150)
    expect(s.byMethod[0]?.method).toBe("upi");
  });

  it("prefers grandTotal over total when both present", () => {
    const s = aggregateDaybook([
      row({ status: "PAID", grandTotal: 300, total: 999, paymentMethod: "card" as never }),
    ]);
    expect(s.collected).toBe(300);
  });
});
