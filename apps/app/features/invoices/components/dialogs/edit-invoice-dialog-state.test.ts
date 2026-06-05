import { describe, expect, it } from "vitest";
import {
  calculateInvoiceTotal,
  createBlankInvoiceItem,
  parseInvoiceStatus,
  removeInvoiceItem,
  updateInvoiceItems,
} from "./edit-invoice-dialog-state";

describe("edit invoice dialog state", () => {
  it("updates only supported invoice item fields", () => {
    const items = [createBlankInvoiceItem()];

    expect(
      updateInvoiceItems(items, 0, "description", "Consultation")[0],
    ).toMatchObject({
      description: "Consultation",
      quantity: 1,
      price: 0,
    });
    expect(updateInvoiceItems(items, 0, "quantity", 2)[0]?.quantity).toBe(2);
    expect(updateInvoiceItems(items, 0, "price", 150)[0]?.price).toBe(150);
    expect(updateInvoiceItems(items, 0, "price", "ignored")[0]?.price).toBe(0);
  });

  it("removes items and totals remaining lines", () => {
    const items = [
      { description: "Consultation", quantity: 1, price: 300 },
      { description: "Dressing", quantity: 2, price: 100 },
    ];

    expect(removeInvoiceItem(items, 0)).toEqual([items[1]]);
    expect(calculateInvoiceTotal(items)).toBe(500);
  });

  it("normalizes supported invoice statuses", () => {
    expect(parseInvoiceStatus("paid")).toBe("PAID");
    expect(parseInvoiceStatus("PARTIALLY_PAID")).toBe("PARTIALLY_PAID");
    expect(parseInvoiceStatus("draft")).toBeNull();
  });
});
