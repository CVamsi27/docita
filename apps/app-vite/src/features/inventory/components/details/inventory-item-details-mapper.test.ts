import { describe, expect, it } from "vitest";
import { toInventoryItemDetail } from "./inventory-item-details-mapper";

describe("toInventoryItemDetail", () => {
  it("returns null for non-record input", () => {
    expect(toInventoryItemDetail(null)).toBeNull();
    expect(toInventoryItemDetail(undefined)).toBeNull();
    expect(toInventoryItemDetail("item")).toBeNull();
    expect(toInventoryItemDetail(42)).toBeNull();
    expect(toInventoryItemDetail(["not", "a", "record"])).toBeNull();
  });

  it("maps all scalar fields and includes a string expiry date", () => {
    const detail = toInventoryItemDetail({
      name: "Paracetamol",
      category: "Tablets",
      sku: "PARA-500",
      quantity: 120,
      minQuantity: 20,
      unit: "strip",
      purchasePrice: 8.5,
      sellingPrice: 12,
      expiryDate: "2027-01-01",
    });

    expect(detail).toEqual({
      name: "Paracetamol",
      category: "Tablets",
      sku: "PARA-500",
      quantity: 120,
      minQuantity: 20,
      unit: "strip",
      purchasePrice: 8.5,
      sellingPrice: 12,
      expiryDate: "2027-01-01",
      movements: [],
    });
  });

  it("omits expiryDate when it is not a string", () => {
    const detail = toInventoryItemDetail({ name: "X", expiryDate: 123 });

    expect(detail).toEqual({
      name: "X",
      category: "",
      sku: "",
      quantity: 0,
      minQuantity: 0,
      unit: "",
      purchasePrice: 0,
      sellingPrice: 0,
      movements: [],
    });
    expect(detail?.expiryDate).toBeUndefined();
  });

  it("defaults missing scalar fields to empty string and zero", () => {
    const detail = toInventoryItemDetail({ name: "Only name" });

    expect(detail?.category).toBe("");
    expect(detail?.sku).toBe("");
    expect(detail?.unit).toBe("");
    expect(detail?.quantity).toBe(0);
    expect(detail?.minQuantity).toBe(0);
    expect(detail?.purchasePrice).toBe(0);
    expect(detail?.sellingPrice).toBe(0);
  });

  it("passes movements through toInventoryMovements (invalid entries filtered)", () => {
    const detail = toInventoryItemDetail({
      name: "A",
      movements: [
        { id: "m1", type: "purchase", quantity: 10, createdAt: "2026-01-01T00:00:00Z" },
        { id: "m2", type: "sale", quantity: 2, createdAt: "2026-01-02T00:00:00Z" },
        { id: 5 },
      ],
    });

    expect(detail?.movements).toEqual([
      { id: "m1", type: "purchase", quantity: 10, createdAt: "2026-01-01T00:00:00Z" },
      { id: "m2", type: "sale", quantity: 2, createdAt: "2026-01-02T00:00:00Z" },
    ]);
  });
});
