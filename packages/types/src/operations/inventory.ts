import { z } from "zod";

export const INVENTORY_MOVEMENT_TYPES = [
  "IN",
  "OUT",
  "ADJUSTMENT",
  // Direction-carrying sibling of `ADJUSTMENT` (backlog W03). A movement's
  // `quantity` is a positive magnitude and the type decides the sign, so a
  // manual count correction that *reduces* stock needs its own type —
  // otherwise the ledger reconstructs a correction downwards as an increase.
  // `ADJUSTMENT` keeps its historical meaning (stock added).
  "ADJUSTMENT_OUT",
  "EXPIRED",
  "WASTE",
  "INITIAL",
] as const;

export const inventoryMovementTypeSchema = z.enum(INVENTORY_MOVEMENT_TYPES);

/**
 * Sign convention for the movement ledger: a movement's `quantity` is always a
 * positive magnitude, and this is the only place that decides whether it adds
 * to or subtracts from stock. Reconstructing stock from the ledger means
 * applying this same rule to every row, so it has to be shared rather than
 * re-derived per call site (backlog W03).
 */
export const INVENTORY_OUTFLOW_TYPES: ReadonlySet<string> = new Set([
  "OUT",
  "ADJUSTMENT_OUT",
  "EXPIRED",
  "WASTE",
]);

export function inventoryMovementDelta(type: string, quantity: number): number {
  return INVENTORY_OUTFLOW_TYPES.has(type)
    ? -Math.abs(quantity)
    : Math.abs(quantity);
}

export const inventoryMovementSchema = z.object({
  id: z.string(),
  inventoryItemId: z.string(),
  type: z.string(),
  quantity: z.number(),
  referenceType: z.string().nullable().optional(),
  referenceId: z.string().nullable().optional(),
  // Stable identity of the business operation that produced this movement
  // (backlog W03). A retry carrying the same identity applies once instead of
  // double-counting stock.
  operationId: z.string().nullable().optional(),
  // The item's unit at the time the movement was recorded, so history stays
  // self-describing even if the item is later re-unitised.
  unit: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  costPerUnit: z.number().nullable().optional(),
  createdBy: z.string(),
  createdAt: z.date().or(z.string()),
});

export const inventoryItemSchema = z.object({
  id: z.string(),
  clinicId: z.string(),
  name: z.string(),
  category: z.string(),
  sku: z.string().nullable().optional(),
  quantity: z.number(),
  minQuantity: z.number(),
  unit: z.string(),
  purchasePrice: z.number().nullable().optional(),
  sellingPrice: z.number().nullable().optional(),
  expiryDate: z.date().or(z.string()).nullable().optional(),
  batchNumber: z.string().nullable().optional(),
  supplier: z.string().nullable().optional(),
  active: z.boolean(),
  createdAt: z.date().or(z.string()),
  updatedAt: z.date().or(z.string()),

  movements: z.array(inventoryMovementSchema).optional(),
});

export type InventoryItem = z.infer<typeof inventoryItemSchema>;
export type InventoryMovement = z.infer<typeof inventoryMovementSchema>;

export const inventoryStatsSchema = z.object({
  totalItems: z.number(),
  totalValue: z.number(),
  lowStockItems: z.number(),
  expiringItems: z.number(),
  outOfStockItems: z.number(),
});

export type InventoryStats = z.infer<typeof inventoryStatsSchema>;
