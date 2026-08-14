import { describe, expect, it } from "vitest";
import { toInventoryMovements } from "./inventory-item-movement-mapper";

describe("toInventoryMovements", () => {
  it("returns an empty array for non-array input", () => {
    expect(toInventoryMovements(undefined)).toEqual([]);
    expect(toInventoryMovements(null)).toEqual([]);
    expect(toInventoryMovements("not-an-array")).toEqual([]);
    expect(toInventoryMovements({ id: "m1" })).toEqual([]);
  });

  it("filters out movement records missing required fields", () => {
    const result = toInventoryMovements([
      { id: "m1" },
      { id: "m2", type: "purchase" },
      { id: "m3", type: "purchase", quantity: 5 },
      { id: 5, type: "purchase", quantity: 5, createdAt: "2026-01-01T00:00:00Z" },
      { id: "m4", type: "purchase", quantity: 5, createdAt: 42 },
    ]);

    expect(result).toEqual([]);
  });

  it("maps a valid record with a string createdAt", () => {
    expect(
      toInventoryMovements([
        { id: "m1", type: "purchase", quantity: 10, createdAt: "2026-01-01T00:00:00Z" },
      ]),
    ).toEqual([
      { id: "m1", type: "purchase", quantity: 10, createdAt: "2026-01-01T00:00:00Z" },
    ]);
  });

  it("serializes a Date createdAt to an ISO string", () => {
    const result = toInventoryMovements([
      {
        id: "m2",
        type: "sale",
        quantity: -2,
        createdAt: new Date("2026-02-01T00:00:00Z"),
      },
    ]);

    expect(result).toEqual([
      { id: "m2", type: "sale", quantity: -2, createdAt: "2026-02-01T00:00:00.000Z" },
    ]);
  });

  it("includes notes when present as a string and omits them otherwise", () => {
    const [withNotes] = toInventoryMovements([
      {
        id: "m3",
        type: "adjustment",
        quantity: 1,
        createdAt: "2026-03-01T00:00:00Z",
        notes: "expired stock",
      },
    ]);
    expect(withNotes).toEqual({
      id: "m3",
      type: "adjustment",
      quantity: 1,
      createdAt: "2026-03-01T00:00:00Z",
      notes: "expired stock",
    });

    const [withoutNotes] = toInventoryMovements([
      {
        id: "m4",
        type: "adjustment",
        quantity: 1,
        createdAt: "2026-03-01T00:00:00Z",
        notes: 42,
      },
    ]);
    expect(withoutNotes).toEqual({
      id: "m4",
      type: "adjustment",
      quantity: 1,
      createdAt: "2026-03-01T00:00:00Z",
    });
    expect(withoutNotes?.notes).toBeUndefined();
  });
});
