import { z } from 'zod';

export const InventoryItemSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  category: z.string().min(1, 'Category is required'),
  sku: z.string().optional(),
  quantity: z.number().int().min(0).default(0),
  minQuantity: z.number().int().min(0).default(5),
  unit: z.string().default('units'),
  purchasePrice: z.number().min(0).optional(),
  sellingPrice: z.number().min(0).optional(),
  expiryDate: z.date().optional(),
  batchNumber: z.string().optional(),
  supplier: z.string().optional(),
  active: z.boolean().default(true),
  clinicId: z.string().min(1, 'Clinic ID is required'),
});

export const InventoryMovementSchema = z.object({
  type: z.enum(['in', 'out', 'adjustment', 'expired']),
  quantity: z.number().positive('Quantity must be positive'),
  referenceType: z.string().optional(),
  referenceId: z.string().optional(),
  notes: z.string().optional(),
  inventoryItemId: z.string().min(1, 'Inventory Item ID is required'),
  createdBy: z.string().min(1, 'User ID is required'),
});

export type InventoryItemInput = z.input<typeof InventoryItemSchema>;
export type InventoryMovementInput = z.input<typeof InventoryMovementSchema>;
