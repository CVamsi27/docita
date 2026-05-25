import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const trimmedString = (label: string, max = 200) =>
  z.string().trim().min(1, `${label} is required`).max(max);

const optionalTrimmedString = (max = 200) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => (value ? value : undefined));

export const createInventoryItemSchema = z.object({
  name: trimmedString('Name'),
  category: trimmedString('Category', 80),
  quantity: z.number().int().min(0),
  minQuantity: z.number().int().min(0),
  unit: trimmedString('Unit', 40),
  sku: optionalTrimmedString(80),
  purchasePrice: z.number().min(0).optional(),
  sellingPrice: z.number().min(0).optional(),
  expiryDate: z.string().datetime().optional(),
  batchNumber: optionalTrimmedString(80),
  supplier: optionalTrimmedString(120),
});

export const updateInventoryItemSchema = z
  .object({
    name: trimmedString('Name').optional(),
    category: trimmedString('Category', 80).optional(),
    quantity: z.number().int().min(0).optional(),
    minQuantity: z.number().int().min(0).optional(),
    unit: trimmedString('Unit', 40).optional(),
    sku: z.string().trim().max(80).optional(),
    purchasePrice: z.number().min(0).optional(),
    sellingPrice: z.number().min(0).optional(),
    expiryDate: z.string().datetime().optional(),
    batchNumber: z.string().trim().max(80).optional(),
    supplier: z.string().trim().max(120).optional(),
    active: z.boolean().optional(),
  })
  .strict();

export const inventoryMovementSchema = z.object({
  type: z.enum(['IN', 'OUT', 'ADJUSTMENT', 'EXPIRED', 'WASTE', 'INITIAL']),
  quantity: z.number().int().min(1),
  referenceType: z.string().trim().max(80).optional(),
  referenceId: z.string().trim().max(80).optional(),
  notes: z.string().trim().max(500).optional(),
});

export class CreateInventoryItemDto extends createZodDto(
  createInventoryItemSchema,
) {}
export class UpdateInventoryItemDto extends createZodDto(
  updateInventoryItemSchema,
) {}
export class InventoryMovementDto extends createZodDto(
  inventoryMovementSchema,
) {}
