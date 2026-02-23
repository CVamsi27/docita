import { z } from "zod";

export const inventoryMovementSchema = z.object({
  id: z.string(),
  inventoryItemId: z.string(),
  type: z.string(),
  quantity: z.number(),
  referenceType: z.string().nullable().optional(),
  referenceId: z.string().nullable().optional(),
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

  // Relations
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
